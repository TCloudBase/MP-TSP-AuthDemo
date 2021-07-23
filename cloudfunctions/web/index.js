const tcb = require("@cloudbase/node-sdk");
const fs = require("fs");
const path = require("path");
const request = require('request');
const cloud = tcb.init({
  env: tcb.SYMBOL_CURRENT_ENV
})
const db = cloud.database();

function render(tpl, variables) {
  for (let key in variables) {
    const reg = new RegExp("\\$\\{" + key + "\\}", "g");
    tpl = tpl.replace(reg, variables[key]);
  }
  return tpl;
}

exports.main = async (event, context) => {
  let html = ''
  const base_config = (await db.collection('wxid').doc('base_config').get()).data
  if (base_config.length != 0) {
    html = fs.readFileSync(path.resolve(__dirname, "./index.html"), {
      encoding: "utf-8",
    });
    html = render(html,{
      URL:`https://${context.namespace}-${context.tencentcloud_appid}.tcloudbaseapp.com`,
      ID:context.namespace,
      REGION:context.tencentcloud_region
    })
  }
  else {
    let origin = `${context.namespace}-${context.tencentcloud_appid}.${context.tencentcloud_region}.app.tcloudbase.com`
    let ip = await getip(`https://${origin}/call`)
    let key = {
      AES: randomString(43),
      token: randomString(20),
      TURL: `https://${origin}/call`,
      SURL: `https://${origin}/call/$APPID$/call`,
      origin,
      ip,
      id: '',
      key: ''
    }

    html = fs.readFileSync(path.resolve(__dirname, "./no.html"), {
      encoding: "utf-8",
    });
    html = render(html,{
      CKEY:JSON.stringify(key),
      URL:`https://${context.namespace}-${context.tencentcloud_appid}.tcloudbaseapp.com`,
      ID:context.namespace,
      REGION:context.tencentcloud_region
    })
  }
  return {
    isBase64Encoded: false,
    statusCode: 200,
    headers: { "Content-Type": "text/html" },
    body: html,
  };
};

function randomString(length) {
  let str = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (var i = length; i > 0; --i)
    result += str[Math.floor(Math.random() * str.length)];
  return result
}

function getip(url) {
  return new Promise((resolve, reject) => {
    request({
      url,
      method: 'GET'
    }, (error, response) => {
      if (error) {
        reject(error);
      }
      resolve(response.body.split(', ')[0]);
    });
  });
}
