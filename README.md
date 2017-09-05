# Personality Insights Nodejs Starter Application [![Build Status](https://travis-ci.org/watson-developer-cloud/personality-insights-nodejs.svg?branch=master)](http://travis-ci.org/watson-developer-cloud/personality-insights-nodejs) [![codecov.io](https://codecov.io/github/watson-developer-cloud/personality-insights-nodejs/coverage.svg?branch=master)](https://codecov.io/github/watson-developer-cloud/personality-insights-nodejs?branch=master)

  The IBM Watson [Personality Insights][service_url] service uses linguistic analysis to extract cognitive and social characteristics from input text such as email, text messages, tweets, forum posts, and more. By deriving cognitive and social preferences, the service helps users to understand, connect to, and communicate with other people on a more personalized level.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/devops/setup/deploy?repository=https://github.com/watson-developer-cloud/personality-insights-nodejs)

## Getting started

1. You need a Bluemix account. If you don't have one, [sign up][sign_up]. Experimental Watson Services are free to use.

2. Download and install the [Cloud-foundry CLI][cloud_foundry] tool if you haven't already.

3. Edit the `manifest.yml` file and change `<application-name>` to something unique. The name you use determines the URL of your application. For example, `<application-name>.mybluemix.net`.

  ```yaml
  applications:
  - services:
    - my-service-instance
    name: <application-name>
    command: npm start
    path: .
    memory: 512M
  ```

4. Connect to Bluemix with the command line tool.

  ```sh
  cf api https://api.ng.bluemix.net
  cf login
  ```

5. Create and retrieve service keys to access the [Personality Insights][service_url] service:

  ```none
  cf create-service personality_insights lite my-pi-service
  cf create-service-key my-pi-service myKey
  cf service-key my-pi-service myKey
  ```

6. Create a `.env` file in the root directory by copying the sample `.env.example` file using the following command:

  ```none
  cp .env.example .env
  ```
  You will update the `.env` with the information you retrieved in steps 5.

  The `.env` file will look something like the following:

  ```none
  PERSONALITY_INSIGHTS_USERNAME=<username>
  PERSONALITY_INSIGHTS_PASSWORD=<password>
  ```

7. Install the dependencies you application need:

  ```none
  npm install
  ```

8. Start the application locally:

  ```none
  npm start
  ```

9. Point your browser to [http://localhost:3000](http://localhost:3000).

10. **Optional:** Push the application to Bluemix:

  ```none
  cf push
  ```

After completing the steps above, you are ready to test your application. Start a browser and enter the URL of your application.

            <your application name>.mybluemix.net


For more details about developing applications that use Watson Developer Cloud services in Bluemix, see [Getting started with Watson Developer Cloud and Bluemix][getting_started].

### Setting Up the Twitter Application

1. [Create a Twitter application][create_twitter_app].

2. Add your application's callback URL:
  - For Bluemix environment: `<application-name>.mybluemix.net/auth/twitter/callback`
  - For Local environment: `http://localhost:3000/auth/twitter/callback`

3. Update the `.env` file and add your twitter application credentials:

  ```none
  TWITTER_CONSUMER_KEY=<consumer-key>
  TWITTER_CONSUMER_SECRET=<consumer-secret>
  ```

4. Restart the app locally or push it again to Bluemix.


## Troubleshooting

* The main source of troubleshooting and recovery information is the Bluemix log. To view the log, run the following command:

  ```sh
  cf logs <application-name> --recent
  ```

* For more details about the service, see the [documentation][documentation] for the Personality Insights.



### Directory structure

```none
.
├── app.js                       // express entry point
├── config                       // express configuration
│   ├── error-handler.js
│   ├── express.js
│   ├── i18n.js
│   ├── passport.js
│   └── security.js
├── helpers                      // utility modules
│   ├── personality-insights.js
│   └── twitter-helper.js
├── i18n                         // internationalization
│   ├── en.json
│   ├── es.json
│   └── ja.json
├── manifest.yml
├── package.json
├── public
│   ├── css
│   ├── data                     // sample text and tweets
│   ├── fonts
│   ├── images
│   └── js
├── router.js                   // express routes
├── server.js                   // application entry point
├── test
└── views                       // ejs views
```

## License

  This sample code is licensed under Apache 2.0.

## Contributing

  See [CONTRIBUTING](.github/CONTRIBUTING.md).

## Open Source @ IBM
  Find more open source projects on the [IBM Github Page](http://ibm.github.io/)

## Privacy Notice

Sample web applications that include this package may be configured to track deployments to [IBM Bluemix](https://www.bluemix.net/) and other Cloud Foundry platforms. The following information is sent to a [Deployment Tracker](https://github.com/IBM-Bluemix/cf-deployment-tracker-service) service on each deployment:

* Node.js package version
* Node.js repository URL
* Application Name (`application_name`)
* Space ID (`space_id`)
* Application Version (`application_version`)
* Application URIs (`application_uris`)
* Labels of bound services
* Number of instances for each bound service and associated plan information

This data is collected from the `package.json` file in the sample application and the `VCAP_APPLICATION` and `VCAP_SERVICES` environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

[deploy_track_url]: https://github.com/cloudant-labs/deployment-tracker
[cloud_foundry]: https://github.com/cloudfoundry/cli
[getting_started]: https://console.bluemix.net/docs/services/watson/index.html#about
[documentation]: https://console.bluemix.net/docs/services/personality-insights/getting-started.html
[create_twitter_app]: https://apps.twitter.com/app/new
[sign_up]: https://console.ng.bluemix.net/registration/
