# Jira-Time-Calculation


              JavaScript getting All Jira Epics Story Points and Time Estimate Wrapper for NodeJS.
 Jira-time-calculation is node.js module, used for getting all jira epic story points and time estimates with their subtasks by using Jira 
 REST API.


Node Version Support - v10.15.3+


Installation - 
npm install --save https://github.com/ravindrapatidar/Jira-Time-Calculation/tarball/master





Example - 

var jiraTimeCalculation = require('jira-time-calculation')


const getProjectKeysJson = () => {
  var jsonKeys = { "projectjiraKey": "node-data", "projectjiraname": "Node-Data", "email": "ravindra.patidar@talentica.com",
  "api_token": "qUFeEOJEaD7ILyFgR0xb1057" };
  return jsonKeys;
}


jiraTimeCalculation.getProjectKeysJson = getProjectKeysJson; 
return jiraTimeCalculation.getStoryPointAndTimeEstimateKey().then(function(jsonEpicsDetails) {
  console.log(jsonEpicsDetails);
  return jsonEpicsDetails;
});




Output - 
Json String contain epics details in project

[{
"epic_name":"NOD-131",
"story_point":2,
"subtasks":[
     {
      "issueKey":"NOD-138",
      "story_point":4, 
      "timeEstimate":"",
       "subtasks":[
              {
               "issueKey":"NOD-140",
                "story_point":"",
                "timeEstimate":28800
              },
             {
            "issueKey":"NOD-141",
            "story_point":"",
            "timeEstimate":28800
             }
               ]
     },
    {
     "issueKey":"NOD-139",
      "story_point":"",
      "timeEstimate":28800,
      "subtasks":[]
      }
   ]
}






- Need to add following keys in json object(jsonkeys)

1) projectjirakey -
Example of projectjiraKey is, if your jira url contain “node-data.atlassian.net” then projectjirakey is “node-data”.
2) projectJiraName - name of your project
3) email- jira email
4) api_token - API token of your jira account
Follow the step in this link to generate API token - https://confluence.atlassian.com/cloud/api-tokens-938839638.html




Dependencies Use - 

"@types/node": "^12.6.3",
 "jira-connector": "^2.15.6",
 "q": "^1.5.1"







