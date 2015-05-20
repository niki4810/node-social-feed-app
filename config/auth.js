// config/auth.js

// NOTE: Since this file is cheked into public repository removing all the keys from config
module.exports = {
	development:{
	    'facebook' : {
	        'consumerKey': 'your app id',
	        'consumerSecret': 'your app secret',
	        'callbackUrl': 'http://socialauthenticator.com:8000/auth/facebook/callback'	        					   
	    },
	    'twitter' : {
	        'consumerKey': 'your app id',
	        'consumerSecret': 'your app secret',
	        'callbackUrl': 'http://socialauthenticator.com:8000/auth/twitter/callback'	        					   
	    }		
	}
}
