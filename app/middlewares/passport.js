let passport = require('passport')
let LocalStrategy = require('passport-local').Strategy
let FacebookStrategy = require('passport-facebook').Strategy
let TwitterStrategy = require('passport-twitter').Strategy
let nodeifyit = require('nodeifyit')
let User = require('../models/user')
let _ = require('lodash')

require('songbird')

function useExternalPassportStrategy(OauthStrategy, config, field) {
  config.passReqToCallback = true
  passport.use(new OauthStrategy(config, nodeifyit(authCB, {spread: true})))
  let socialNetworkType = field;
  async function authCB(req, token, _ignored_, account) {
      if(!account) {
        throw Error("Invalid account");  
      }     
      let userId  = account.id;
      let query = {};
      if(socialNetworkType === 'facebook'){
        query['facebook.id'] = userId
      }else if(socialNetworkType === 'twitter') {
        query['twitter.id'] = userId
      }else if(socialNetworkType === 'google'){
        query['google.id'] = userId
      }else {
        throw Error('Invalid Social Network type')
      }
      
      let user
      // if req exists and user is loggedin
      if(req && req.user) {
        user = req.user
      }else{
        user = await User.promise.findOne(query)
        if(!user) {
          user = new User({})
        }
      }
      
      if(socialNetworkType === 'facebook'){        
        let email = !_.isEmpty(account.emails) ? account.emails[0].value : "not found"         
        user.facebook =  {
            id: userId,
            token: token,
            secret: _ignored_,
            email: email, 
            name: account.displayName
          };
      }else if(socialNetworkType === 'twitter'){
        user.twitter = {
          id: userId,
          token: token,
          secret: _ignored_,
          displayName: account.displayName,
          userName: account.username
        }
      }      

      return await user.save()
  }
}

function configure(config) {
    passport.serializeUser(nodeifyit(async(user) => user.id))
    passport.deserializeUser(nodeifyit(async(id) => {
        return await User.promise.findById(id)
    }))

  useExternalPassportStrategy(FacebookStrategy, {
        clientID: config.facebook.consumerKey,
        clientSecret: config.facebook.consumerSecret,
        callbackURL: config.facebook.callbackUrl
    }, 'facebook')

  useExternalPassportStrategy(TwitterStrategy, {
        consumerKey: config.twitter.consumerKey,
        consumerSecret: config.twitter.consumerSecret,
        callbackURL: config.twitter.callbackUrl
    }, 'twitter')
  
  passport.use('local-login', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true
  }, nodeifyit(async (email, password) => {
    let user    
    user = await User.promise.findOne({
      'local.email': email
    })
     
    console.log(user); 
    if(!user || user.local.email !== email) {
      return [false, {message: 'Invalid username'}]
    }  
    
    if(!await user.validatePassword(password)) {
      return [false, {message: 'Invalid password'}]
    }  
    return user
  }, {spread: true})))


  passport.use('local-signup', new LocalStrategy({
    // Use "email" field instead of "username"
    usernameField: 'email',
    failureFlash: true,
    passReqToCallback: true
  }, nodeifyit(async (req, email, password) => { 
      console.log("reached here");         
      email = (email || '').toLowerCase()
      let currUser = await User.promise.findOne({'local.email': email})

      console.log(currUser);
      if(currUser) {
        return [false, {message: 'User already exists'}]
      }

      // create the user
      let user = new User({
        local: {}
      })

      user.local.email = email
      user.local.password = await user.generateHash(password)

      try{
        let result = await user.save()
        console.log(result);
        return result;
      }catch(e) {
        return [false, {message: e.message}]
      }      
  }, {spread: true})))

  return passport
}

module.exports = {passport, configure}
