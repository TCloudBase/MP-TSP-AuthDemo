window.get = getQueryString();
window.tcbWebBase.init({
  cloudbase: {
    envid: ENVID
  },
  data: {
    fullscreenLoading: false,
    login_load: false,
    donelogin: false,
    func_list: [],
    appid:null,
    updatedue:null
  },
  created() {
    loginstate()  //登录检测
  },
  methods: {
    tologin: async () => {//执行登录
      window.app.login_load = true
      await getPreurl()
      window.app.login_load = false
    },
    outlogin: outlogin,//退出登录
  }
})

/**
 * 初始化加载应用信息（授权列表信息）
 */
async function init() {
  let authorizer_data = await getAuthorizer()
  window.app.fullscreenLoading = false
  if (authorizer_data.msg != null) {
    window.app.$notify.error({
      title: '服务登录异常，请重新操作登录！',
      message: authorizer_data.msg,
      duration: 0
    });
    outlogin()
  }
  else if(authorizer_data.no!=null){

  }
  else {
    if(window.get.auth_code!=null){
      location.href = location.origin + location.pathname;
    }
    window.app.donelogin = true
    window.app.func_list = authorizer_data.result.func_list
    window.app.appid = authorizer_data.result.appid
    window.app.updatedue = authorizer_data.result.updatedue
  }
}

/**
 * 退出授权登录
 */
async function outlogin() {
  await cancelAuth()
  location.href = location.origin + location.pathname;
}

/**
 * 登录状态初始化
 * 如果是自定义登录，则执行init流程，否则匿名登录状态，并判断是否有授权code
 */
async function loginstate() {
  window.app.fullscreenLoading = true
  if (window.auth == null) {
    window.auth = window.cloud.auth({
      persistence: 'local'
    });
    await window.auth.anonymousAuthProvider().signIn()
  }
  init()
  // confirmlogin()

  // auth.getLoginState().then(async (loginState) => {
  //   if (loginState && loginState.isCustomAuth) {
  //     window.authappid = loginState.user.customUserId
  //     init()
  //   } else {
  //     await auth.anonymousAuthProvider().signIn()
  //     if (window.get.auth_code != null) {
  //       confirmlogin()
  //     }
  //     else {
  //       window.app.fullscreenLoading = false
  //       window.app.donelogin = false
  //     }
  //   }
  // });
}

/**
 * 工具：获取网址中URL—GET参数
 */
function getQueryString() {
  var qs = location.search.substr(1),
    args = {},
    items = qs.length ? qs.split("&") : [],
    item = null,
    len = items.length;
  for (var i = 0; i < len; i++) {
    item = items[i].split("=");
    var name = decodeURIComponent(item[0]),
      value = decodeURIComponent(item[1]);
    if (name) {
      args[name] = value;
    }
  }
  return args;
}