window.tcbWebBase.init({
  cloudbase: {
    envid: window.ENVID,
    region: window.REGION
  },
  data: {
    form: JSON.parse(CKEY),
    submit_load: false
  },
  created() {
    init()
  },
  methods: {
    submit: async function () {
      let checklist = ['TURL', 'SURL', 'origin', 'ip']
      let orkey = JSON.parse(CKEY)
      let pass = true;
      for (let i of checklist) {
        if (orkey[i] != window.app.form[i]) {
          pass = false;
          break;
        }
      }
      if (pass) {
        window.app.submit_load = true
        let result = await callCS('update_config', {
          data: window.app.form
        })
        window.app.submit_load = false
        if (result.code == 0) {
          location.href = location.href
        }
        else {
          window.app.$notify.error({
            title: result.msg,
            message: '请尝试刷新页面来解决',
            duration: 0
          });
        }
      }
      else{
        window.app.$notify.error({
          title: '你填写的部分信息不符合要求',
          message: '需要保证「授权发起页域名、授权事件接收URL、消息与事件接收URL、白名单IP地址列表」保持自动填充，不要更改。你可以刷新重新获取！',
          duration: 0
        });
      }
    }
  }
})

async function init() {
  if (window.auth == null) {
    window.auth = window.cloud.auth({
      persistence: 'local'
    });
    await window.auth.anonymousAuthProvider().signIn()
  }
}

/**
 * 第三方平台服务基础API函数
 * @param {*} type 
 */
function callCS(type, data) {
  return new Promise((resolve, reject) => {
    window.cloud.callFunction({
      name: "component_server",
      data: {
        type: type,
        ...data
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
