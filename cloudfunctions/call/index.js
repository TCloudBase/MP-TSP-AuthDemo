const tcb = require("@cloudbase/node-sdk");
const WechatEncrypt = require('./util')
const request = require('request');
const fs = require("fs");
const path = require("path");

const cloud = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})
const db = cloud.database();
const _ = db.command

let xml = ''

function api_get_img(url) {
  return new Promise((resolve, reject) => {
    request({
      url,
      method: 'GET'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body);
    }).pipe(fs.createWriteStream(path.join('/tmp', 'image.png')))
  });
}

exports.main = async (event) => {
  const base_config = (await db.collection('wxid').doc('base_config').get()).data
  if (base_config.length != 0) {
    const WXKEY = {
      appId: base_config[0].component_appid,
      encodingAESKey: base_config[0].encodingAESKey,
      token: base_config[0].token
    }
    //--------
    let res = {}
    let msg_body = event.body;
    let { msg_signature, nonce, timestamp } = event.queryStringParameters;
    if (msg_signature != null) {
      //对信息进行base64处理
      let encryptedMsg = Buffer.from(msg_body, 'base64').toString();
      //读取Encrypt中DATA信息
      let encrypt = encryptedMsg.slice(encryptedMsg.indexOf('<Encrypt><![CDATA[') + 18, encryptedMsg.indexOf(']]></Encrypt>'));
      //初始化解密函数对象
      const wechatEncrypt = new WechatEncrypt(WXKEY);
      //对消息进行签名处理
      let signature = wechatEncrypt.genSign({ timestamp, nonce, encrypt });
      //判断签名是否和传入签名一致，安全
      if (signature === msg_signature) {
        //正式解密数据
        xml = wechatEncrypt.decode(encrypt);
        //如果数据为ticket
        if (xml.indexOf('ComponentVerifyTicket') != -1) {
          //取出ticket数据
          let ticket = xml.slice(xml.indexOf('ticket@@@'), xml.indexOf(']]></ComponentVerifyTicket>'));
          //存储ticket
          let upresult = await db.collection('wxid').doc('component_verify_ticket').set({
            time: db.serverDate(),
            value: ticket
          });
          console.log(upresult)
        }
        else {
          //处理解密信息，获取消息类型
          let messtype = xml.slice(xml.indexOf('MsgType><![CDATA[') + 17, xml.indexOf(']]></MsgType'))
          //消息类型如果是文字或者图片，符合要求
          if (['text', 'image'].indexOf(messtype) != -1) {
            //获取请求path路径上类型
            let resolve_type = event.path.slice(event.path.lastIndexOf('/') + 1)
            //获取请求path路径上appid
            let appid = event.path.slice(1, event.path.lastIndexOf('/'))
            //构造消息对象
            let mess_item = {}
            mess_item.openid = xml.slice(xml.indexOf('FromUserName><![CDATA[') + 22, xml.indexOf(']]></FromUserName'))
            mess_item.time = xml.slice(xml.indexOf('<CreateTime>') + 12, xml.indexOf('</CreateTime>'))
            mess_item.type = messtype
            if (messtype == 'text') mess_item.content = xml.slice(xml.indexOf('<Content><![CDATA[') + 18, xml.indexOf(']]></Content'))
            else {
              mess_item.content = xml.slice(xml.indexOf('PicUrl><![CDATA[') + 16, xml.indexOf(']]></PicUrl'))
              await api_get_img(mess_item.content)
              let { fileID } = await cloud.uploadFile({ cloudPath: `messimg/${appid}/${mess_item.openid}/${mess_item.time}.png`, fileContent: fs.createReadStream(path.join('/tmp', 'image.png')) })
              mess_item.content = fileID
            }
            //如果类型为call（这是一个校验，可以去掉，需要保证设置的监听url能对的上号）
            if (resolve_type == 'call') {
              //存储消息
              try {
                await db.collection('mess').doc(appid).update({
                  chat_list: {
                    [mess_item.openid]: _.push([mess_item])
                  }
                })
              }
              catch (e) {
                console.log('no data open!')
              }
            }
          }
        }
        res = 'success';
      }
      else {
        res = 'error';
      }
    }
    else {
      res = event.headers['x-forwarded-for']
    }
    cloud.logger().log({
      path: event.path,
      xml_msg: xml,
      msg_signature: msg_signature,
      nonce: nonce,
      wx_timestamp: timestamp,
      msg_body: msg_body
    })
    return res;
  }
  else{
    return event.headers['x-forwarded-for'];
  }
}