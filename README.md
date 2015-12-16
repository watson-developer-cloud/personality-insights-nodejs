# Personality Insights Nodejs Starter Application

  The IBM Watson [Personality Insights][service_url] service uses linguistic analysis to extract cognitive and social characteristics from input text such as email, text messages, tweets, forum posts, and more. By deriving cognitive and social preferences, the service helps users to understand, connect to, and communicate with other people on a more personalized level.

Give it a try! Click the button below to fork into IBM DevOps Services and deploy your own copy of this application on Bluemix.

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/watson-developer-cloud/personality-insights-nodejs)

## Getting Started

1. Create a Bluemix Account

  [Sign up][sign_up] in Bluemix, or use an existing account. Watson Services in Beta are free to use.

2. Download and install the [Cloud-foundry CLI][cloud_foundry] tool

3. Edit the `manifest.yml` file and change the `<application-name>` to something unique.  

  ```none
  applications:
  - services:
    - personality-insights
    name: <application-name>
    command: node app.js
    path: .
    memory: 256M
  ```
  The name you use will determinate your application url initially, e.g. `<application-name>.mybluemix.net`.

4. Connect to Bluemix in the command line tool
  ```sh
  $ cf api https://api.ng.bluemix.net
  $ cf login -u <your user ID>
  ```

5. Create the Personality Insights service in Bluemix

  ```sh
  $ cf create-service personality_insights tiered personality-insights-service
  ```

6. Push it live!

  ```sh
  $ cf push
  ```

See the full [Getting Started][getting_started] documentation for more details, including code snippets and references.

## Running locally
  The application uses [Node.js](http://nodejs.org/) and [npm](https://www.npmjs.com/) so you will have to download and install them as part of the steps below.

1. Copy the credentials from your `personality-insights-service` service in Bluemix to `app.js`, you can see the credentials using:

    ```sh
    $ cf env <application-name>
    ```
    Example output:
    ```sh
    System-Provided:
    {
    "VCAP_SERVICES": {
      "personality_insights": [{
          "credentials": {
            "url": "<url>",
            "password": "<password>",
            "username": "<username>"
          },
        "label": "personality_insights",
        "name": "personality-insights-service",
        "plan": "IBM Watson Personality Insights Monthly Plan"
     }]
    }
    }
    ```

    You need to copy `username`, `password` and `url`.

2. Install [Node.js](http://nodejs.org/)
3. Go to the project folder in a terminal and run:
    `npm install`
4. Start the application
5.  `node app.js`
6. Go to `http://localhost:3000`

## i18n Support

  The application has i18n support and is available in English and
  Spanish. The language is automatically selected from the browser's
  locale.

  To add a new translation follow the steps below:

  1. Translating the static text:
  	1. Locate the `en.json` file present in the `i18n` directory. This
       file includes all the messages and labels in English.
  	1. Copy `en.json` and name the new file with the format `ll-CC.json` or
       `ll.json`, where `ll` is the language code and `CC` is the country
       code. For example, a new translation for argentinian Spanish would
       be named after `es-AR.json`. You may omit the country code to make
       the translation global for the language.
	1. Translate each English string to the desired language and save it.
  1. Translating the personality summary:
  	1. Locate the JSON files present in `public/json/` directory.
  	   These are:
	     * `facets.json`
	     * `needs.json`
	     * `summary.json`
	     * `traits.json`
	     * `values.json`
	1. Copy each file and name it with the format `<filename>_ll-CC.json`
	   or `<filename>_ll-CC.json`. For example, a Portuguese language
           translations for `facets.json` will result in a new file named
           `facets_pt.json`, an UK English translation for `traits.json` will
           result in a new file named `traits_en-UK.json`.
	1. Translate all the strings present in the new files to the desired
	   language and save them.

## Troubleshooting

To troubleshoot your Bluemix app the main useful source of information are the logs, to see them, run:

  ```sh
  $ cf logs <application-name> --recent
  ```

## License

  This sample code is licensed under Apache 2.0. Full license text is available in [LICENSE](LICENSE).  
  This sample code uses d3 and jQuery, both distributed under MIT license.

## Contributing

  See [CONTRIBUTING](CONTRIBUTING.md).

## Open Source @ IBM
  Find more open source projects on the [IBM Github Page](http://ibm.github.io/)

[service_url]: http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/personality-insights.html
[cloud_foundry]: https://github.com/cloudfoundry/cli
[getting_started]: http://www.ibm.com/smarterplanet/us/en/ibmwatson/developercloud/doc/getting_started/
[sign_up]: https://console.ng.bluemix.net/registration/
