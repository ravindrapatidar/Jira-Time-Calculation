"use strict";
exports.__esModule = true;
var q = require('Q');
var JiraClient = require('jira-connector');
var fs = require('fs');
var enumerable = require('linq');
var config = JSON.parse(fs.readFileSync("./config.json"));
var storyPointKey = "";
var jsonArrEpic = [];
var newJsonArr = [];
var newNewJsonArr = [];
var arrIssues = [];
var newJsonEpic = [];
var initJiraClient = function (projName) {
    var host = projName + ".atlassian.net";
    var jira = new JiraClient({
        host: host,
        strictSSL: true // One of optional parameters
    });
    return jira;
};
var initJiraClientWithAuth = function (projName) {
    var jsonValues = exports.getProjectKeysJson();
    var host = projName + ".atlassian.net";
    var jira = new JiraClient({
        host: host,
        basic_auth: {
            email: jsonValues["email"],
            api_token: jsonValues["api_token"]
        },
        strictSSL: true // One of optional parameters
    });
    return jira;
};
var apiCallAsyncforGetEpicIssues = function (epicId) {
    var jsonValuess = exports.getProjectKeysJson();
    var jira = initJiraClientWithAuth(jsonValuess["projectjiraKey"]);
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
var apiCall = function (key, epicId, arrJsonEpic, parentKey) {
    // var str = config.jiraProjectName + ".atlassian.net"
    // var url = "https://" + str + "rest/api/3/issue/NOD-130" 
    //var jira = initJiraClient(config.jiraProjectName);
    var timeKey = "timeestimate";
    var arrSubtask = [];
    var obj = { "parentKey": parentKey };
    var jsonValuess = exports.getProjectKeysJson();
    var jira = initJiraClient(jsonValuess["projectjiraKey"]);
    return jira.issue.getIssue({ issueKey: epicId }).then(function (issue) {
        console.log(issue.fields[key]);
        obj["issueKey"] = issue["key"];
        if (issue.fields[key] != undefined) {
            obj["story_point"] = issue.fields[key];
            arrSubtask.push(obj);
            // arrJsonEpic["subtaks"] = arrSubtask
            return arrSubtask;
        }
        else {
            //if (issue.field[timeKey]) {
            obj["timeEstimate"] = issue.fields[timeKey];
            arrSubtask.push(obj);
            // arrJsonEpic["subtaks"] = arrSubtask
            return arrSubtask;
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
            var epicId = epicObject["epicId"];
            var obj1 = { "epickey": epicId }; //epic key
            newJsonEpic.push(obj1);
            var arr = epicObject["issues"]; // issues in epic
            arr.forEach(function (issue) {
                if (issue["fields"]) {
                    console.log(issue["fields"]);
                    var fields = issue["fields"];
                    var parentKey = issue["key"];
                    var obj = { "issueKey": issue["key"] };
                    obj["parentIssue"] = epicId;
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
                        var arrSubTaks = [];
                        subtasks.forEach(function (task) {
                            var issueId = task["key"];
                            arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic, parentKey));
                        });
                    }
                    else {
                        var issueId = issue["key"];
                        // arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic))
                    }
                }
            });
        });
    });
    return q.allSettled(arrAsyncCalls);
};
var filterEpicJson = function (arrSubtasks) {
    var newArrIssues = [];
    arrIssues.forEach(function (issue) {
        var arr = [];
        arrSubtasks.forEach(function (task) {
            var arrTask = task["value"];
            if (arrTask[0]["parentKey"] == issue["issueKey"]) {
                var obj4 = { "issueKey": arrTask[0]["issueKey"] };
                if (arrTask[0]["story_point"] != undefined) {
                    obj4["story_point"] = arrTask[0]["story_point"];
                }
                else {
                    obj4["story_point"] = "";
                }
                if (arrTask[0]["timeEstimate"] != undefined) {
                    obj4["timeEstimate"] = arrTask[0]["timeEstimate"];
                }
                else {
                    obj4["timeEstimate"] = "";
                }
                arr.push(obj4);
            }
        });
        var obj = { "issueKey": issue["issueKey"] };
        if (issue["story_point"] != undefined) {
            obj["story_point"] = issue["story_point"];
        }
        else {
            obj["story_point"] = "";
        }
        if (issue["timeEstimate"] != undefined) {
            obj["timeEstimate"] = issue["timeEstimate"];
        }
        else {
            obj["timeEstimate"] = "";
        }
        obj["subtasks"] = arr;
        var key = issue["parentIssue"];
        var obj1 = {};
        obj1[key] = obj;
        newArrIssues.push(obj1);
    });
    var objIssue = { "issues": newArrIssues };
    newJsonEpic.push(objIssue);
    console.log(newJsonEpic);
    jsonArrEpic.forEach(function (epicObj) {
        var obj = { "epic_name": epicObj["epic_name"], "story_point": epicObj["story_point"] };
        var arrIssueSubtask = [];
        Object.keys(newArrIssues).forEach(function (key) {
            if (newArrIssues[key][epicObj["epic_name"]] != undefined) {
                arrIssueSubtask.push(newArrIssues[key][epicObj["epic_name"]]);
            }
            console.log(newArrIssues[key], newArrIssues[key][epicObj["epic_name"]]);
        });
        obj["subtasks"] = arrIssueSubtask;
        newJsonArr.push(obj);
    });
    console.log(newJsonArr);
    var str = JSON.stringify(newJsonArr);
    console.log(str);
    return str;
};
var makeJsonEpic = function (arrEpic) {
    var arrEpicIds = [];
    arrEpic.forEach(function (epic) {
        var epicObj = { "epic_name": epic["key"], "story_point": epic["fields"][storyPointKey] };
        jsonArrEpic.push(epicObj);
        arrEpicIds.push(epic["key"]);
    });
    return getEpicIssues(arrEpicIds).then(function (jsonEpicIssues) {
        return makeNewJsonEpic(jsonEpicIssues, jsonArrEpic).then(function (newJsonEpicIssue) {
            console.log(newJsonEpicIssue);
            var epicJsonStr = filterEpicJson(newJsonEpicIssue);
            console.log(epicJsonStr);
            return epicJsonStr;
        });
        console.log(jsonEpicIssues);
    });
};
var getProjectEpic = function (projectName) {
    var jsonValues = exports.getProjectKeysJson();
    var jira = initJiraClient(jsonValues["projectjiraKey"]);
    var jqlStr = "project = " + projectName + " AND issuetype=Epic";
    var opt = { jql: jqlStr };
    return jira.search.search(opt).then(function (epic) {
        console.log(epic);
        return makeJsonEpic(epic.issues).then(function (jsonStr) {
            console.log(jsonStr);
            return jsonStr;
        });
    })["catch"](function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
};
exports.getStoryPointAndTimeEstimateKey = function () {
    var jsonValues = exports.getProjectKeysJson();
    var jira = initJiraClient(jsonValues["projectjiraKey"]);
    return jira.field.getAllFields().then(function (fields) {
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
            return getProjectEpic(jsonValues["projectjiraname"]).then(function (finalJsonEpicRes) {
                console.log(finalJsonEpicRes);
                return finalJsonEpicRes;
            });
        }
    })["catch"](function (err) {
        // API call failed...
        throw err;
    });
};
exports.getProjectKeysJson = function () {
    var jsonKeys = {};
    //  var jsonKeys = {"projectjiraKey": "node-data", "projectjiraname": "Node-Data", "email": "ravindra.patidar@talentica.com",
    // "api_token": "qUFeEOJEaD7ILyFgR0xb1057"}
    return jsonKeys;
};
// getStoryPointAndTimeEstimateKey().then(function(res) {
//     console.log(res);
// });
