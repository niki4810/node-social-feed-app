let isLoggedIn = require('./middlewares/isLoggedIn')
let _ = require('lodash')
let then = require('express-then')
let Twitter  = require('twitter')
let scope = 'email'
let networks = {
  twitter: {
      'icon': 'twitter',
      'name': 'Twitter',
      'class': 'btn-info'    
  }
}
let posts = require('../data/posts')

module.exports = (app) => {
    let passport = app.passport
    let twitterConfig = app.config.auth.twitter

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
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })
    
   let [tweets] = await twitterClient.promise.get('statuses/home_timeline') 
   posts = _.map(tweets, function(tweet){
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


    res.render('timeline.ejs',{
      posts: posts
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
      

      await twitterClient.promise.post('statuses/update.json', {status})      
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

  app.post('/reply/:id', isLoggedIn, then(async(req, res) => {
      let twitterClient = new Twitter({
          consumer_key: twitterConfig.consumerKey,
          consumer_secret: twitterConfig.consumerSecret,
          access_token_key: req.user.twitter.token,
          access_token_secret: req.user.twitter.secret
      })

      let id = req.params.id
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
    console.log(req.body.share);
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

  app.post('/unshare/:id', isLoggedIn, then(async (req,res) => {    
    let twitterClient = new Twitter({
      consumer_key: twitterConfig.consumerKey,
      consumer_secret: twitterConfig.consumerSecret,
      access_token_key: req.user.twitter.token,
      access_token_secret: req.user.twitter.secret
    })

    let id = req.params.id
    console.log(id);
    try{
      await twitterClient.promise.post('statuses/destroy', {id})      
    }catch(e){
      console.log(e);
    }
    res.end()
  }))

  // Facebook routes
  // Authentication route & Callback URL
  app.get('/auth/facebook', passport.authenticate('facebook', {scope}))
  app.get('/auth/facebook/callback', passport.authenticate('facebook', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/facebook', passport.authorize('facebook', {scope}))
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


  //Google+ routes    
  app.get('/auth/google', passport.authenticate('google', {scope}))
  app.get('/auth/google/callback', passport.authenticate('google', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))

  // Authorization route & Callback URL
  app.get('/connect/google', passport.authorize('google', {scope}))
  app.get('/connect/google/callback', passport.authorize('google', {
      successRedirect: '/profile',
      failureRedirect: '/login',
      failureFlash: true
  }))
}