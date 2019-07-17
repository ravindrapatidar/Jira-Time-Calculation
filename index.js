var q = require('Q');
var JiraClient = require('jira-connector');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync("./config.json"));
var storyPointKey = "";
var jsonArrEpic = [];
var newJsonArr = [];
var initJiraClient = function (projName) {
    var host = projName + ".atlassian.net";
    var jira = new JiraClient({
        host: host,
        strictSSL: true // One of optional parameters
    });
    return jira;
};
var initJiraClientWithAuth = function (projName) {
    var host = projName + ".atlassian.net";
    var jira = new JiraClient({
        host: host,
        basic_auth: {
            email: "ravindra.patidar@talentica.com",
            api_token: "qUFeEOJEaD7ILyFgR0xb1057"
        },
        strictSSL: true // One of optional parameters
    });
    return jira;
};
var apiCallAsyncforGetEpicIssues = function (epicId) {
    var jira = initJiraClientWithAuth(config.jiraProjectKey);
    var arrIssues = [];
    return jira.epic.getIssuesForEpic({
        epicId: epicId
    }).then(function (issue) {
        console.log(issue);
        var obj = { "epicId": epicId, "issues": issue.issues.slice() };
        arrIssues.push(obj);
        return arrIssues;
    })["catch"](function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
};
var getEpicIssues = function (arrEpicIds) {
    var arrAsyncCalls = [];
    arrEpicIds.forEach(function (epicId) {
        arrAsyncCalls.push(apiCallAsyncforGetEpicIssues(epicId));
    });
    return q.allSettled(arrAsyncCalls);
};
var apiCall = function (key, epicId, arrJsonEpic) {
    // var str = config.jiraProjectName + ".atlassian.net"
    // var url = "https://" + str + "rest/api/3/issue/NOD-130" 
    //var jira = initJiraClient(config.jiraProjectName);
    var host = config.jiraProjectName + ".atlassian.net";
    var timeKey = "timeestimate";
    var arrSubtask = [];
    var obj = { "issueKey": epicId };
    var jira = initJiraClient(config.jiraProjectKey);
    return jira.issue.getIssue({ issueKey: epicId }).then(function (issue) {
        console.log(issue.fields[key]);
        if (issue.fields[key] != undefined) {
            obj["story_point"] = issue.fields[key];
            arrSubtask.push(obj);
            arrJsonEpic["subtaks"] = arrSubtask;
            return arrJsonEpic;
        }
        else {
            //if (issue.field[timeKey]) {
            obj["timeEstimate"] = issue.fields[timeKey];
            arrSubtask.push(obj);
            arrJsonEpic["subtaks"] = arrSubtask;
            return arrJsonEpic;
        }
    })["catch"](function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
};
var makeNewJsonEpic = function (arrEpicIssues, oldJsonEpic) {
    var arrAsyncCalls = [];
    var timeKey = "timeestimate";
    arrEpicIssues.forEach(function (epics) {
        var epicObjects = epics["value"];
        epicObjects.forEach(function (epicObject) {
            var newJsonEpic = [];
            var epicId = epicObject["epicId"];
            var obj1 = { "epickey": epicId };
            newJsonEpic.push(obj1);
            var arrIssues = [];
            var arr = epicObject["issues"];
            arr.forEach(function (issue) {
                if (issue["fields"]) {
                    console.log(issue["fields"]);
                    var fields = issue["fields"];
                    var obj = { "issueKey": issue["key"] };
                    if (fields[storyPointKey] != undefined) {
                        obj["story_point"] = fields[storyPointKey];
                    }
                    else {
                        obj["story_point"] = "";
                    }
                    if (fields[timeKey] != undefined) {
                        obj["timeEstimate"] = fields[timeKey];
                    }
                    else {
                        obj["timeEstimate"] = "";
                    }
                    arrIssues.push(obj);
                    var subtasks = fields["subtasks"];
                    if (subtasks.length > 0) {
                        subtasks.forEach(function (task) {
                            var issueId = task["key"];
                            arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic));
                        });
                    }
                    else {
                        var issueId = issue["key"];
                        // arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic))
                    }
                }
            });
            var objIssue = { "issues": arrIssues };
            newJsonEpic.push(objIssue);
            console.log(newJsonEpic);
            jsonArrEpic.forEach(function (epicObj) {
                var obj = { "epic_name": epicObj["epic_name"], "story_point": epicObj["story_point"] };
                newJsonEpic.forEach(function (newObj) {
                    if (epicObj["epic_name"] == newObj["epickey"]) {
                        obj["subtasks"] = arrIssues;
                        newJsonArr.push(obj);
                    }
                });
            });
            console.log(newJsonArr);
        });
    });
    return q.allSettled(arrAsyncCalls);
};
var makeJsonEpic = function (arrEpic) {
    var arrEpicIds = [];
    arrEpic.forEach(function (epic) {
        var epicObj = { "epic_name": epic["key"], "story_point": epic["fields"][storyPointKey] };
        jsonArrEpic.push(epicObj);
        arrEpicIds.push(epic["key"]);
    });
    getEpicIssues(arrEpicIds).then(function (jsonEpicIssues) {
        makeNewJsonEpic(jsonEpicIssues, jsonArrEpic).then(function (newJsonEpicIssue) {
            console.log(newJsonEpicIssue);
        });
        console.log(jsonEpicIssues);
    });
};
var getProjectEpic = function (projectName) {
    var jira = initJiraClient(config.jiraProjectKey);
    var jqlStr = "project = " + projectName + " AND issuetype=Epic";
    var opt = { jql: jqlStr };
    jira.search.search(opt).then(function (epic) {
        console.log(epic);
        makeJsonEpic(epic.issues);
    })["catch"](function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
};
var getStoryPointAndTimeEstimateKey = function () {
    var jira = initJiraClient(config.jiraProjectKey);
    jira.field.getAllFields().then(function (fields) {
        //console.log(issue.fields[key]);
        var key = "";
        var val = "Story Points";
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
    })["catch"](function (err) {
        // API call failed...
        throw err;
    });
};
getStoryPointAndTimeEstimateKey();
