/**
 * 获取预授权URL,并做跳转
 */
async function getPreurl(){
    const preurl_data = await callCS('preauth_url')
    if(preurl_data.url != null){
        console.log(preurl_data)
        location.href = preurl_data.url
    }
    else {
      window.app.$message.error(`请等待10分钟左右！微信服务器正在发送ticket!`);
    }
}

/**
 * 获取登录APPID的授权状态
 */
async function getAuthorizer(){
    return await callCS('authorizer_states')
}

async function cancelAuth(){
  return await callCS('cancel_auth')
}

/**
 * 第三方平台服务基础API函数
 * @param {*} type 
 */
function callCS(type) {
    return new Promise((resolve, reject) => {
        window.cloud.callFunction({
            name: "component_server",
            data: {
                type: type,
                code: window.get.auth_code
            }
        }).then((res) => {
            resolve(res.result)
        }).catch(e => {
            reject(e)
            window.app.fullscreenLoading = false
            window.app.$notify.error({
                title: '第三方平台服务异常',
                message: e,
                duration: 0
            });
        })
    })
}