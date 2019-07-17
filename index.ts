var q = require('Q');
var JiraClient = require('jira-connector');
const fs = require('fs');
const config = JSON.parse(fs.readFileSync("./config.json"));
var storyPointKey = ""
var jsonArrEpic: any = [];
var newJsonArr:any = [];

const initJiraClient = (projName: string) => {
    var host = projName + ".atlassian.net"
    var jira = new JiraClient({
        host: host,
        strictSSL: true // One of optional parameters
    });
    return jira;
}
const initJiraClientWithAuth = (projName: string) => {
    var host = projName + ".atlassian.net"
    var jira = new JiraClient({
        host: host,
        basic_auth: {
            email: "ravindra.patidar@talentica.com",
            api_token: "qUFeEOJEaD7ILyFgR0xb1057"
        },
        strictSSL: true // One of optional parameters
    });
    return jira;
}

const apiCallAsyncforGetEpicIssues = (epicId: string) => {
    var jira = initJiraClientWithAuth(config.jiraProjectKey);
    var arrIssues = [];
    return jira.epic.getIssuesForEpic({
        epicId: epicId
    }).then(issue => {
        console.log(issue);
        var obj = { "epicId": epicId, "issues": [...issue.issues] }
        arrIssues.push(obj);
        return arrIssues;
    }).catch(function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
}
const getEpicIssues = (arrEpicIds: []) => {
    var arrAsyncCalls = [];
    arrEpicIds.forEach(epicId => {
        arrAsyncCalls.push(apiCallAsyncforGetEpicIssues(epicId));
    });
    return q.allSettled(arrAsyncCalls);
}
const apiCall = (key: string, epicId: string, arrJsonEpic: []) => {
    // var str = config.jiraProjectName + ".atlassian.net"
    // var url = "https://" + str + "rest/api/3/issue/NOD-130" 
    //var jira = initJiraClient(config.jiraProjectName);
    var host = config.jiraProjectName + ".atlassian.net"
    var timeKey = "timeestimate"
    var arrSubtask: any = [];

    var obj = { "issueKey": epicId }

    var jira = initJiraClient(config.jiraProjectKey);

    return jira.issue.getIssue({ issueKey: epicId }).then(issue => {
        console.log(issue.fields[key]);
        if (issue.fields[key] != undefined) {
            obj["story_point"] = issue.fields[key]
            arrSubtask.push(obj);
            arrJsonEpic["subtaks"] = arrSubtask
            return arrJsonEpic
        } else {
            //if (issue.field[timeKey]) {
            obj["timeEstimate"] = issue.fields[timeKey]
            arrSubtask.push(obj);
            arrJsonEpic["subtaks"] = arrSubtask
            return arrJsonEpic
        }
    }).catch(function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });

}
const makeNewJsonEpic = (arrEpicIssues: [], oldJsonEpic: []) => {
    var arrAsyncCalls = [];
  
    var timeKey = "timeestimate"
    arrEpicIssues.forEach((epics) => {
        let epicObjects: [] = epics["value"];
        epicObjects.forEach((epicObject) => {
            var newJsonEpic: any = [];
            let epicId = epicObject["epicId"]
            var obj1 = { "epickey": epicId }
            newJsonEpic.push(obj1);
            var arrIssues: any = [];
            let arr: [] = epicObject["issues"]
            arr.forEach((issue) => {
                if (issue["fields"]) {
                    console.log(issue["fields"]);
                    let fields = issue["fields"];
                    var obj = {"issueKey" : issue["key"] }
                    if (fields[storyPointKey] != undefined) {
                        obj["story_point"] = fields[storyPointKey];
                    } else {
                        obj["story_point"] = "";
                    }
                    if (fields[timeKey] != undefined) {
                        obj["timeEstimate"] = fields[timeKey];
                    } else {
                        obj["timeEstimate"] = "";
                    }
                    arrIssues.push(obj);
                    let subtasks: [] = fields["subtasks"]
                    if (subtasks.length > 0) {
                        subtasks.forEach((task) => {
                            let issueId = task["key"]
                            arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic))
                        });
                    } else {
                        let issueId = issue["key"];
                       // arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic))
                    }
                }
            });
            var objIssue = {"issues": arrIssues}
            newJsonEpic.push(objIssue);
            console.log(newJsonEpic);
          
            jsonArrEpic.forEach(epicObj => {
                var obj = {"epic_name": epicObj["epic_name"], "story_point" : epicObj["story_point"]}
                newJsonEpic.forEach(newObj => {
                   if (epicObj["epic_name"] == newObj["epickey"]) {
                       obj["subtasks"] = arrIssues
                       newJsonArr.push(obj)
                   }
                });
               
            });
            console.log(newJsonArr);
           
        });
    });
        return q.allSettled(arrAsyncCalls);

    }
const makeJsonEpic = (arrEpic: []) => {
       
        var arrEpicIds: any = [];
        arrEpic.forEach(epic => {
            var epicObj = { "epic_name": epic["key"], "story_point": epic["fields"][storyPointKey] }
            jsonArrEpic.push(epicObj);
            arrEpicIds.push(epic["key"]);
        });
        getEpicIssues(arrEpicIds).then(function (jsonEpicIssues) {
            makeNewJsonEpic(jsonEpicIssues, jsonArrEpic).then(newJsonEpicIssue => {
                console.log(newJsonEpicIssue);
            })
            console.log(jsonEpicIssues);
        });

    }
    const getProjectEpic = (projectName: string) => {

        var jira = initJiraClient(config.jiraProjectKey);
        var jqlStr = `project = ${projectName} AND issuetype=Epic`
        var opt = { jql: jqlStr };
        jira.search.search(opt).then(epic => {
            console.log(epic);
            makeJsonEpic(epic.issues);
        }).catch(function (err) {
            console.log(err);
            // API call failed...
            throw err;
        });
    }

    const getStoryPointAndTimeEstimateKey = () => {
        var jira = initJiraClient(config.jiraProjectKey);

        jira.field.getAllFields().then(fields => {
            //console.log(issue.fields[key]);
            var key = ""
            var val = "Story Points"
            var index;
            // var arr = JSON.parse(fields);
            var filteredObj = fields.find(function (item, i) {
                if (item.name === val) {
                    index = i;
                }
            });

            console.log(fields[index].id);
            if (index) {
                key = fields[index].id;
                storyPointKey = key;
                getProjectEpic("Node-Data");
            }
        }).catch(function (err) {
            // API call failed...
            throw err;
        });
    }

    getStoryPointAndTimeEstimateKey();


