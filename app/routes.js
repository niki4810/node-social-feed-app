let isLoggedIn = require('./middlewares/isLoggedIn')
let _ = require('lodash')
let then = require('express-then')
let Twitter  = require('twitter')
let FB = require('fb');
let rp = require('request-promise')
let Promise = require('promise');
let scope = 'email'
let fs = require('fs')

let facebookScope = 'public_profile,email,user_friends'

let networks = {
  twitter: {
      'icon': 'twitter',
      'name': 'Twitter',
      'class': 'btn-info'    
  },
  facebook: {
      icon: 'facebook',
      name: 'Facebook',
      class: 'btn-primary'
  }
}

// let posts = require('../data/posts')

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitter
    let facebookConfig = app.config.auth.facebook

    FB.options({
        appId:          facebookConfig.consumerKey,
        appSecret:      facebookConfig.consumerSecret,
        redirectUri:    facebookConfig.callbackUrl
    });

    app.get('/', (req, res) => res.render('index.ejs'))

    app.get('/profile', isLoggedIn, (req, res) => {
        res.render('profile.ejs', {
            user: req.user,
            message: req.flash('error')
        })
    })

    app.get('/logout', (req, res) => {
        req.logout()
        res.redirect('/')
    })

  // Login page routes
  app.get('/login', (req, res) => {
    res.render('login.ejs', {message: req.flash('error')})
  })

  app.post('/login', passport.authenticate('local-login', {
    successRedirect: '/profile',
    failureRedirect: '/login',
    failureFlash: true
  } ))

  // Sign up page routes
  app.get('/signup', (req, res) => {
    res.render('signup.ejs', {message: req.flash('error')})
  })
  
  // process the signup form
  app.post('/signup', passport.authenticate('local-signup', {
    successRedirect: '/profile',
    failureRedirect: '/signup',
    failureFlash: true
  }))


  //Timeline routes

  app.get('/timeline', isLoggedIn, then(async (req,res) => {
    // get tweets from twitter
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })
    
   let [tweets] = await twitterClient.promise.get('statuses/home_timeline') 
   let twitterPosts = _.map(tweets, function(tweet){
    return {
      id: tweet.id_str,
      image: tweet.user.profile_image_url,
      text: tweet.text,
      name: tweet.user.name,
      username: "@" + tweet.user.screen_name,
      liked: tweet.favorited,
      retweeted: tweet.retweeted,
      retweedStatusId: tweet.retweeted && tweet.retweeted_status ? tweet.retweeted_status.id_str : null,
      network: networks.twitter
    }
   })

    let atoken = req.user.facebook.token;

    let response = await rp({
        uri: `https://graph.facebook.com/me/home/?access_token=${atoken}&limit=10`,
        resolveWithFullResponse: true
    })
      
    let fbFeeds;    
    if(response && response.body){      
      // await fs.promise.writeFile('msg.txt', response.body);
      let fbPosts = JSON.parse(response.body);      
      let fbData = fbPosts.data;
      // console.log(JSON.stringify(fbData[0]));
      fbFeeds = _.map(fbData, function(post){
        let likedArr = post.likes && post.likes.data;
        let liked = false;
        let fromId = post.from.id;
        let fromName = post.from.name;
        if(!_.isEmpty(likedArr)){
          let filterLikedArr = _.find(likedArr, function(arr){
            if(arr.id === fromId && arr.name === fromName){
              return arr;
            }
          });
          liked = !_.isEmpty(filterLikedArr);
        }  
        return {
            id: post.id,
            image: post.picture,
            text: post.description ? post.description : post.message ? post.message : "",
            name: post.from.name,
            username: post.name,
            liked: liked,           
            network: networks.facebook
        }
      });
    }
    
  
    res.render('timeline.ejs',{
      twitterPosts: twitterPosts || [],
      fbFeeds: fbFeeds || []
    })
  }));


  //Sharing routes
  app.post('/share/:id', isLoggedIn, then(async (req,res) => {    
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })
    let id = req.params.id
    let text = req.body.text;
    if (text.length > 140) {
            return req.flash('error', 'Status is over 140 characters')
    }
    if (!text.length) {
        return req.flash('error', 'Status cannot be empty')
    }
            

    await twitterClient.promise.post('statuses/retweet/' + id, {text})
        
    res.redirect('/timeline')
  }))

  app.get('/share/:id', isLoggedIn, then(async(req, res) => {
      let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
      })

      let id = req.params.id

      let [tweet] = await twitterClient.promise.get('/statuses/show/' + id)

      tweet = {
          id: tweet.id_str,
          image: tweet.user.profile_image_url,
          text: tweet.text,
          name: tweet.user.name,
          username: "@" + tweet.user.screen_name,
          liked: tweet.favorited,
          network: networks.twitter
      }

      res.render('share.ejs', {
          post: tweet
      })
  }))


  app.get('/fb-share/:id', isLoggedIn, then(async (req,res) => {
    let id = req.params.id;      
    FB.setAccessToken(req.user.facebook.token);   
    let response = await new Promise((resolve, reject) => FB.api('/' + id , resolve))  

    let liked = false;
        let fromId = response.from.id;
        let fromName = response.from.name;
        if(!_.isEmpty(response.likes.data)){
          let filterLikedArr = _.find(response.likes.data, function(arr){
            if(arr.id === fromId && arr.name === fromName){
              return arr;
            }
          });
          liked = !_.isEmpty(filterLikedArr);
        } 

    let fbPost = {
      id: response.id,
      image: response.picture,
      text: response.message,
      name: response.from.name,
      username: response.name,
      liked: liked,
      network: networks.facebook      
    }
    
    res.render('share.ejs', {
          post: fbPost
      })  
  }))

  app.get('/compose', isLoggedIn, (req,res) => {
    res.render('compose.ejs')
  })

  app.post('/compose', isLoggedIn, then(async (req,res) => {    
    let status = req.body.reply
    let networkType = req.body.networkType;
    
    if(!networkType) {
      return req.flash('error', 'Invalid network type')
    }

    if(!status) {
      return req.flash('error', 'Status cannot be empty')
    }

    if(status.length > 140) {
      return req.flash('error', 'Status is over 140 characters')
    }

    if(networkType === 'twitter'){
      let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret
      })
      

      await twitterClient.promise.post('statuses/update', {status})      
    }else if(networkType === 'facebook') {
      FB.setAccessToken(req.user.facebook.token);      
      let response = await new Promise((resolve, reject) => FB.api('me/feed', 'post', { message: status}, resolve))
    } 

    res.redirect('/timeline') 
  }))


  app.get('/reply/:id', isLoggedIn, then(async(req, res) => {
    let twitterClient = new Twitter({
        consumer_key: twitterConfig.consumerKey,
        consumer_secret: twitterConfig.consumerSecret,
        access_token_key: req.user.twitter.token,
        access_token_secret: req.user.twitter.secret
    })
    let id = req.params.id
    let [tweet] = await twitterClient.promise.get('/statuses/show/' + id)

    tweet = {
        id: tweet.id_str,
        image: tweet.user.profile_image_url,
        text: tweet.text,
        name: tweet.user.name,
        username: "@" + tweet.user.screen_name,
        liked: tweet.favorited,
        network: networks.twitter
    }

    res.render('reply.ejs', {
        post: tweet
    })
  }))

  app.get('/fb-reply/:id', isLoggedIn, then(async (req,res) => {
    let id = req.params.id;      
    FB.setAccessToken(req.user.facebook.token);   
    let response = await new Promise((resolve, reject) => FB.api('/' + id , resolve))  

    let liked = false;
        let fromId = response.from.id;
        let fromName = response.from.name;
        if(!_.isEmpty(response.likes.data)){
          let filterLikedArr = _.find(response.likes.data, function(arr){
            if(arr.id === fromId && arr.name === fromName){
              return arr;
            }
          });
          liked = !_.isEmpty(filterLikedArr);
        } 

    let fbPost = {
      id: response.id,
      image: response.picture,
      text: response.message,
      name: response.from.name,
      username: response.name,
      liked: liked,
      network: networks.facebook      
    }
    
    res.render('reply.ejs', {
        post: fbPost
    })
    
  }))

  app.post('/reply/:id', isLoggedIn, then(async(req, res) => {
      if(!req.body && !req.body.networkName){
        throw Error('Invalid network name')
      }

      let id = req.params.id
      let networkName = req.body.networkName
      if(networkName === 'Twitter'){
        let twitterClient = new Twitter({
            consumer_key: twitterConfig.consumerKey,
            consumer_secret: twitterConfig.consumerSecret,
            access_token_key: req.user.twitter.token,
            access_token_secret: req.user.twitter.secret
        })
        
        let reply = req.body.reply
        if(!reply) {
          return req.flash('error', 'Status cannot be empty')
        }

        if(reply.length > 140) {
          return req.flash('error', 'Status is over 140 characters')
        }

        await twitterClient.promise.post('statuses/update', {
            status: reply,
            in_reply_to_status_id: id
        })
      }else {    
        FB.setAccessToken(req.user.facebook.token);   
        let response = await new Promise((resolve, reject) => FB.api(`${id}/comments`, 'post', {message: req.body.reply}, resolve))  
      }
      
      res.redirect('/timeline')
  }))



  app.post('/like/:id', isLoggedIn, then(async (req,res) => {    
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })

    let id = req.params.id
    await twitterClient.promise.post('favorites/create', {id})
    res.end()
  }))

  app.post('/unlike/:id', isLoggedIn, then(async (req,res) => {    
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })

    let id = req.params.id
    await twitterClient.promise.post('favorites/destroy', {id})
    res.end()
  }))

  app.post('/fb-like/:id', isLoggedIn, then(async (req,res) => {
    let id = req.params.id   
    FB.setAccessToken(req.user.facebook.token);   
    let response = await new Promise((resolve, reject) => FB.api('/' + id + '/likes', 'post', resolve))
    res.end();
  }))

  app.post('/fb-unlike/:id', isLoggedIn, then(async (req, res) => {
    console.log("reached here");
    let id = req.params.id   
    FB.setAccessToken(req.user.facebook.token);   
    let response = await new Promise((resolve, reject) => FB.api('/' + id + '/likes', 'delete', resolve))
    res.end();
  }));

  app.post('/unshare/:id', isLoggedIn, then(async (req,res) => {    
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })

    let id = req.params.id
    await twitterClient.promise.post('statuses/destroy', {id})      
    res.end()
  }))

  // Facebook routes
  // Authentication route & Callback URL
  app.get('/auth/facebook', passport.authenticate('facebook', {scope: ['email', 'user_posts', 'user_photos', 'read_stream', 'public_profile','user_likes', 'publish_actions']}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {scope: ['email', 'user_posts', 'read_stream', 'user_photos', 'public_profile','user_likes', 'publish_actions']}))
  app.get('/connect/facebook/callback', passport.authorize('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))

  //Twitter routes
  app.get('/auth/twitter', passport.authenticate('twitter', {scope}))
  app.get('/auth/twitter/callback', passport.authenticate('twitter', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/twitter', passport.authorize('twitter', {scope}))
  app.get('/connect/twitter/callback', passport.authorize('twitter', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))
}