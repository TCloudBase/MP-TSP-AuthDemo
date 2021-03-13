const api = require('./app/api.js')

exports.main = async (event) => {
  console.log(event)
  if (event.type != null) {
    if(event.type == 'preauth_url'){                        //获取预授权链接
      return await api.getPreAuthUrl(event.wx)
    }
    if(event.type == 'cancel_auth'){                        //取消授权状态
      return await api.cancelAuth()
    }
    if(event.type == 'authorizer_states'){                  //获取授权方主体基础信息（授权时间，权限集合）
      return await api.getAuthorizerStates(event.code)
    }
    if(event.type == 'update_config'){                      //更新服务商基础信息
      return await api.updateConfig(event.data)
    }
  }
  else {
    return 404
  }
}
