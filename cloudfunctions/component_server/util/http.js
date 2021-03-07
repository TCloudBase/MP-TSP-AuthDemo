const tcb = require("@cloudbase/node-sdk");
const request = require('request');
const fs = require("fs");
const path = require("path");
let component_appid, component_appsecret, redirect_uri = null


const cloud = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})
const db = cloud.database();

async function initConfig() {
  const base_config = (await db.collection('wxid').doc('base_config').get()).data
  if (base_config.length != 0) {
    component_appid = base_config[0].component_appid,
      component_appsecret = base_config[0].component_appsecret,
      redirect_uri = base_config[0].redirect_uri
    return {
      component_appid, redirect_uri
    }
  }
  else {
    return false
  }
}


function api_component_token(ticket) {
  return new Promise((resolve, reject) => {
    request({
      url: 'https://api.weixin.qq.com/cgi-bin/component/api_component_token',
      body: JSON.stringify({
        component_appid,
        component_appsecret,
        component_verify_ticket: ticket
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_create_preauthcode(token) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/cgi-bin/component/api_create_preauthcode?component_access_token=${token}`,
      body: JSON.stringify({
        component_appid
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_query_auth(token, code) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/cgi-bin/component/api_query_auth?component_access_token=${token}`,
      body: JSON.stringify({
        component_appid,
        authorization_code: code
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_authorizer_token(refresh_token, access_token, auth_appid) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/cgi-bin/component/api_authorizer_token?component_access_token=${access_token}`,
      body: JSON.stringify({
        component_appid: component_appid,
        authorizer_appid: auth_appid,
        authorizer_refresh_token: refresh_token
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_batchgetenvid(access_token, auth_appids) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/batchgetenvid?access_token=${access_token}`,
      body: JSON.stringify({
        appids: auth_appids
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_createenv(access_token) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/createenv?access_token=${access_token}`,
      body: JSON.stringify({
        alias: 'wxtcb'
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_batchshareenv(access_token, env, appids) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/batchshareenv?access_token=${access_token}`,
      body: JSON.stringify({
        data: [{
          env,
          appids
        }]
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_describeenvs(access_token) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/describeenvs?access_token=${access_token}`,
      body: JSON.stringify({}),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_batchuploadscf(access_token, functionname, envs, zipfile) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/batchuploadscf?access_token=${access_token}`,
      body: JSON.stringify({
        functionname,
        envs,
        zipfile,
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_batchuploadscfcode(access_token, functionname, envs, zipfile) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/batchuploadscfcode?access_token=${access_token}`,
      body: JSON.stringify({
        functionname,
        envs,
        zipfile,
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_dbcollection(access_token, env, collection_name, action = 'add') {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/dbcollection?access_token=${access_token}&action=${action}`,
      body: JSON.stringify({
        env,
        collection_name,
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_uploadfile(access_token, env, path) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/uploadfile?access_token=${access_token}`,
      body: JSON.stringify({
        env,
        path,
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_uploadcall(url, key, Signature, token, fileid, file) {
  return new Promise((resolve, reject) => {
    request({
      url,
      method: 'POST',
      formData: {
        key,
        Signature,
        'x-cos-security-token': token,
        'x-cos-meta-fileid': fileid,
        file
      }
    }, function (error, response) {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_dbrecord(access_token, env, action, query) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/componenttcb/dbrecord?access_token=${access_token}&action=${action}`,
      body: JSON.stringify({
        env,
        query
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_commit(access_token, template_id, ext_json, user_version, user_desc) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/wxa/commit?access_token=${access_token}`,
      body: JSON.stringify({
        template_id,
        ext_json,
        user_version,
        user_desc
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });
}

function api_get_qrcode(access_token) {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/wxa/get_qrcode?access_token=${access_token}`,
      method: 'GET'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    }).pipe(fs.createWriteStream(path.join('/tmp', 'code.jpg')))
  });
}

function api_custom_send(access_token, touser, text, msgtype = "text") {
  return new Promise((resolve, reject) => {
    request({
      url: `https://api.weixin.qq.com/cgi-bin/message/custom/send?access_token=${access_token}`,
      body: JSON.stringify({
        touser,
        msgtype,
        text: {
          content: text
        }
      }),
      method: 'POST'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    });
  });

}


module.exports = {
  api_component_token,
  api_create_preauthcode,
  api_query_auth,
  api_authorizer_token,
  api_batchgetenvid,
  api_createenv,
  api_batchshareenv,
  api_describeenvs,
  api_batchuploadscf,
  api_batchuploadscfcode,
  api_dbcollection,
  api_uploadfile,
  api_uploadcall,
  api_dbrecord,
  api_commit,
  api_get_qrcode,
  api_custom_send,
  initConfig
}