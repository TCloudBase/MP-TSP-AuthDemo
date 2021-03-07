const tcb = require("@cloudbase/node-sdk");
const api = require("../util/http.js");
const authkey = require("../util/authkey.json")

const cloud = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})
const db = cloud.database();

/**
 * 获取当前访问用户的UID，包含在鉴权信息中
 */
function getuid() {
  const userinfo = cloud.auth().getUserInfo()
  console.log('用户UID：', userinfo.uid)
  return userinfo.uid
}

/**
 * 获取UID访问用户的APPID
 */
async function getappid() {
  let appid = null;
  let userres = (await db.collection('mini').where({
    uid: getuid()
  }).get()).data
  console.log('登录池结果：', userres)
  if (userres.length != 0) {
    appid = userres[0].appid

  }
  return appid
}

/**
 * 获取第三方平台access_token
 */
async function getComponentToken() {
  let access_token = null
  let data_ticket = null
  let api_component_result = null
  let res = {};

  let data_component = (await db.collection('wxid').doc('component_access_token').get()).data;

  if (data_component.length != 0) {
    data_component = data_component[0]
    let overtime = new Date((new Date()).valueOf() + 60 * 1000);
    if (data_component.time > overtime) {
      access_token = data_component.value;
    }
    else {
      console.log('timeout token!')
    }
  }
  else {
    console.log('no save token!')
  }

  if (access_token == null) {
    data_ticket = (await db.collection('wxid').doc('component_verify_ticket').get()).data;
    if (data_ticket.length != 0) {
      data_ticket = data_ticket[0]
      api_component_result = await api.api_component_token(data_ticket.value);

      if (api_component_result.indexOf('component_access_token') != -1) {
        let { component_access_token, expires_in } = JSON.parse(api_component_result);
        access_token = component_access_token;

        let save_data = {
          time: db.serverDate({
            offset: expires_in * 1000
          }),
          value: component_access_token
        }

        let upresult = await db.collection('wxid').doc('component_access_token').update(save_data);
        if (upresult.updated == 0) {
          await db.collection('wxid').add({ _id: 'component_access_token', ...save_data });
        }

      } else {
        console.log('wxcall failed！=======>\n', api_component_result);
        res.msg = 'wxcall failed！'
      }
    }
    else {
      console.log('no save ticket!')
      res.msg = 'no save ticket!'
    }
  }

  res.access_token = access_token
  cloud.logger().log({
    ...res,
    data_component,
    data_ticket,
    api_component_result
  })
  return res
}

/**
 * 获取第三方平台预授权Url链接
 */
async function getPreAuthUrl() {
  let configres = await api.initConfig()
  if (configres != false) {
    let component_appid = configres.component_appid
    let redirect_uri = configres.redirect_uri
    let res = {}
    let api_res = await getComponentToken()
    if (api_res.access_token != null) {
      let auth_url = null;
      let api_preauthcode_result = await api.api_create_preauthcode(api_res.access_token);
      if (api_preauthcode_result.indexOf('pre_auth_code') != -1) {
        let { pre_auth_code } = JSON.parse(api_preauthcode_result);
        res.url = `https://mp.weixin.qq.com/cgi-bin/componentloginpage?component_appid=${component_appid}&pre_auth_code=${pre_auth_code}&redirect_uri=${redirect_uri}`;
      }
      else {
        res.msg = 'wxcall failed!'
      }
      cloud.logger().log({
        api_preauthcode_result,
        auth_url
      })
    }
    else {
      res.msg = 'component_token is failed!'
    }
    return res
  }
  else {
    return 'no config!'
  }
}

/**
 * 根据授权码code确认授权信息
 */
async function confirmAuth(code) {
  await api.initConfig()
  let res = {}
  let api_res = await getComponentToken()
  if (api_res.access_token != null) {
    let api_query_result = await api.api_query_auth(api_res.access_token, code);
    if (api_query_result.indexOf('authorization_info') != -1) {
      let { authorization_info } = JSON.parse(api_query_result);
      let { authorizer_access_token, authorizer_appid, authorizer_refresh_token, expires_in, func_info } = authorization_info;
      let save_data = {
        func_info,
        access_token: authorizer_access_token,
        time: db.serverDate({ offset: expires_in * 1000 }),
        appid: authorizer_appid,
        refresh_token: authorizer_refresh_token,
        updatedue: db.serverDate(),
        uid: getuid()
      }
      await db.collection('mini').doc(authorizer_appid).set(save_data);
      res.appid = authorizer_appid
    }
    else {
      res.msg = 'wxcall failed!'
    }
    cloud.logger().log({
      api_query_result
    })
  }
  else {
    res.msg = 'component_token is failed!'
  }
  return res;
}

async function cancelAuth() {
  let res = {}
  let appid = await getappid()
  if (appid != null) {
    await db.collection('mini').doc(appid).update({
      uid: 'NULL'
    });
    res.code = 0;
  }
  else {
    res.msg = 'no auth'
  }
  return res
}

/**
 * 根据APPID获取授权者access_token
 * @param {*} appid 
 */
async function getAuthorizerToken(appid) {
  let configres = await api.initConfig()
  if (configres != false) {
    let component_appid = configres.component_appid
    let api_authorizer_result = null;
    let res = {};
    let data_authorizer = (await db.collection('mini').doc(appid).get()).data;
    if (data_authorizer.length != 0) {
      data_authorizer = data_authorizer[0]
      let { access_token, time, refresh_token } = data_authorizer;
      let overtime = new Date((new Date()).valueOf() + 60 * 1000);
      if (time > overtime) {
        res.access_token = access_token
      }
      else {
        let api_res = await getComponentToken()
        if (api_res.access_token != null) {
          api_authorizer_result = await api.api_authorizer_token(refresh_token, api_res.access_token, appid);
          if (api_authorizer_result.indexOf('authorizer_access_token') != -1) {
            let { authorizer_access_token, authorizer_refresh_token, expires_in } = JSON.parse(api_authorizer_result);
            let save_data = {
              access_token: authorizer_access_token,
              time: db.serverDate({ offset: expires_in * 1000 }),
              refresh_token: authorizer_refresh_token
            }
            await db.collection('mini').doc(appid).update(save_data);
            res.access_token = authorizer_access_token;
          }
          else {
            res.msg = 'wxcall failed!'
          }
        }
        else {
          res.msg = 'component_token is failed!'
        }
      }
    }
    else {
      res.msg = 'no found appid!'
    }
    res.from_appid = component_appid
    cloud.logger().log({
      api_authorizer_result,
      data_authorizer
    })
    return res;
  }
  else {
    return 'no config!'
  }
}

/**
 * 根据APPID获取授权状态，包括授权列表等
 * @param {*} appid 
 */
async function getAuthorizerStates(code = null) {
  if (code != null) {
    await confirmAuth(code)
  }
  let res = {};
  let appid = await getappid()
  if (appid != null) {
    let data_authorizer = (await db.collection('mini').doc(appid).get()).data;
    if (data_authorizer.length != 0) {
      let { createdue, updatedue, func_info } = data_authorizer[0]
      let func_list = {}
      for (let item of func_info) {
        func_list[item.funcscope_category.id] = authkey[item.funcscope_category.id]
      }
      res.result = {
        appid,
        createdue,
        updatedue,
        func_list
      }
    }
    else {
      res.msg = 'no found appid!'
    }
    cloud.logger().log({
      data_authorizer
    })
  }
  else {
    res.no = 'no auth'
  }
  return res;
}

/**
 * 配置第三方服务商基础信息，如果配置过则不能更新，需要主动在数据库中删除才可以
 */
async function updateConfig(data){
  let configres = await api.initConfig()
  if (configres == false) {
    await db.collection('wxid').doc('base_config').set({
      component_appid:data.id,
      component_appsecret:data.key,
      encodingAESKey:data.AES,
      redirect_uri:data.TURL.slice(0,data.TURL.lastIndexOf('call'))+'web',
      token:data.token
    })
    return {
      code:0
    }
  }
  else{
    return {
      code:-1,
      msg:'已经配置过第三方服务商信息'
    }
  }
}

module.exports = {
  getPreAuthUrl,
  getAuthorizerStates,
  cancelAuth,
  updateConfig
}