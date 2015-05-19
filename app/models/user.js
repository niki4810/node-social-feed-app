let mongoose = require('mongoose')
let bcrypt = require('bcrypt')

let userSchema = mongoose.Schema({
    local: {
       email:String,
       password: String
    },
    facebook: {
      id: String,
      token: String,
      email: String,
      name: String
    },
    twitter: {
       id: String,
       token: String,
       email: String,
       name: String,
       secret:String,
       displayName: String,
       userName: String
    },
    google: {
       id: String,
       token: String,
       email: String,
       name: String
    }
})

userSchema.methods.generateHash = async function(password) {
    return await bcrypt.promise.hash(password, 8)
}

userSchema.methods.validatePassword = async function(password) {
    return await bcrypt.promise.compare(password, this.local.password)
}

userSchema.methods.linkAccount = function(type, values) {
  // linkAccount('facebook', ...) => linkFacebookAccount(values)
  return this['link'+_.capitalize(type)+'Account'](values)
}

userSchema.methods.linkLocalAccount = function({email, password}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkFacebookAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkTwitterAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkGoogleAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.linkLinkedinAccount = function({account, token}) {
  throw new Error('Not Implemented.')
}

userSchema.methods.unlinkAccount = function(type) {
  throw new Error('Not Implemented.')
}

module.exports = mongoose.model('User', userSchema)
