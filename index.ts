var q = require('Q');
var JiraClient = require('jira-connector');
const fs = require('fs');
const enumerable = require('linq')
const config = JSON.parse(fs.readFileSync("./config.json"));
var storyPointKey = ""
var jsonArrEpic: any = [];
var newJsonArr: any = [];
var newNewJsonArr: any = [];
var arrIssues: any = [];
var newJsonEpic: any = [];

const initJiraClient = (projName: string) => {
    var host = projName + ".atlassian.net"
    var jira = new JiraClient({
        host: host,
        strictSSL: true // One of optional parameters
    });
    return jira;
}
const initJiraClientWithAuth = (projName: string) => {
    let jsonValues = getProjectKeysJson();
    var host = projName + ".atlassian.net"
    var jira = new JiraClient({
        host: host,
        basic_auth: {
            email: jsonValues["email"],
            api_token: jsonValues["api_token"]
        },
        strictSSL: true // One of optional parameters
    });
    return jira;
}

const apiCallAsyncforGetEpicIssues = (epicId: string) => {
    let jsonValuess = getProjectKeysJson();
    var jira = initJiraClientWithAuth(jsonValuess["projectjiraKey"]);
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
const apiCall = (key: string, epicId: string, arrJsonEpic: [], parentKey: string) => {
    // var str = config.jiraProjectName + ".atlassian.net"
    // var url = "https://" + str + "rest/api/3/issue/NOD-130" 
    //var jira = initJiraClient(config.jiraProjectName);
    
    var timeKey = "timeestimate"
    var arrSubtask: any = [];

    var obj = { "parentKey": parentKey }
    let jsonValuess = getProjectKeysJson();
    var jira = initJiraClient(jsonValuess["projectjiraKey"]);

    return jira.issue.getIssue({ issueKey: epicId }).then(issue => {
        console.log(issue.fields[key]);
        obj["issueKey"] = issue["key"]
        if (issue.fields[key] != undefined) {
            obj["story_point"] = issue.fields[key]
            arrSubtask.push(obj);
            // arrJsonEpic["subtaks"] = arrSubtask
            return arrSubtask
        } else {
            //if (issue.field[timeKey]) {
            obj["timeEstimate"] = issue.fields[timeKey]
            arrSubtask.push(obj);
            // arrJsonEpic["subtaks"] = arrSubtask
            return arrSubtask
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

            let epicId = epicObject["epicId"]
            var obj1 = { "epickey": epicId } //epic key
            newJsonEpic.push(obj1);

            let arr: [] = epicObject["issues"] // issues in epic
            arr.forEach((issue) => {
                if (issue["fields"]) {
                    console.log(issue["fields"]);
                    let fields = issue["fields"];
                    var parentKey = issue["key"]
                    var obj = { "issueKey": issue["key"] }
                    obj["parentIssue"] = epicId
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
                        var arrSubTaks: any = [];
                        subtasks.forEach((task) => {
                            let issueId = task["key"]
                            arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic, parentKey));
                        });

                    } else {
                        let issueId = issue["key"];
                        // arrAsyncCalls.push(apiCall(storyPointKey, issueId, newJsonEpic))
                    }
                }
            });


        });
    });
    return q.allSettled(arrAsyncCalls);

}
const filterEpicJson = (arrSubtasks: []) => {
    var newArrIssues: any = [];
    arrIssues.forEach(issue => {
        var arr: any = [];
        arrSubtasks.forEach(task => {
            let arrTask = task["value"]
            if (arrTask[0]["parentKey"] == issue["issueKey"]) {
                var obj4 = { "issueKey": arrTask[0]["issueKey"] }
                if (arrTask[0]["story_point"] != undefined) {
                    obj4["story_point"] = arrTask[0]["story_point"]
                } else {
                    obj4["story_point"] = ""
                }
                if (arrTask[0]["timeEstimate"] != undefined) {
                    obj4["timeEstimate"] = arrTask[0]["timeEstimate"]
                } else {
                    obj4["timeEstimate"] = ""
                }
                arr.push(obj4);
            }
        });

        var obj = { "issueKey": issue["issueKey"] }
        if (issue["story_point"] != undefined) {
            obj["story_point"] = issue["story_point"];
        } else {
            obj["story_point"] = "";
        }
        if (issue["timeEstimate"] != undefined) {
            obj["timeEstimate"] = issue["timeEstimate"];
        } else {
            obj["timeEstimate"] = "";
        }
        obj["subtasks"] = arr
        var key = issue["parentIssue"]
        var obj1 = {}
        obj1[key] = obj
        newArrIssues.push(obj1);

    });

    var objIssue = { "issues": newArrIssues }

    newJsonEpic.push(objIssue);
    console.log(newJsonEpic);

    jsonArrEpic.forEach(epicObj => {
        var obj = { "epic_name": epicObj["epic_name"], "story_point": epicObj["story_point"] }
        var arrIssueSubtask = [];
        Object.keys(newArrIssues).forEach(function (key) {
            if (newArrIssues[key][epicObj["epic_name"]] != undefined) {
                arrIssueSubtask.push(newArrIssues[key][epicObj["epic_name"]])
            }
            console.log(newArrIssues[key], newArrIssues[key][epicObj["epic_name"]]);
        });
        obj["subtasks"] = arrIssueSubtask;
        newJsonArr.push(obj);
    });
    console.log(newJsonArr);
    let str = JSON.stringify(newJsonArr)
    console.log(str);
    return str;
    
}
const makeJsonEpic = (arrEpic: []) => {

    var arrEpicIds: any = [];
    arrEpic.forEach(epic => {
        var epicObj = { "epic_name": epic["key"], "story_point": epic["fields"][storyPointKey] }
        jsonArrEpic.push(epicObj);
        arrEpicIds.push(epic["key"]);
    });
   return getEpicIssues(arrEpicIds).then(function (jsonEpicIssues) {
      return  makeNewJsonEpic(jsonEpicIssues, jsonArrEpic).then(newJsonEpicIssue => {
            console.log(newJsonEpicIssue);
            let epicJsonStr =  filterEpicJson(newJsonEpicIssue);
            console.log(epicJsonStr);
            return epicJsonStr;
           
        })
        console.log(jsonEpicIssues);
    });

}
const getProjectEpic = (projectName: string) => {

    let jsonValues = getProjectKeysJson();
    var jira = initJiraClient(jsonValues["projectjiraKey"]);
    var jqlStr = `project = ${projectName} AND issuetype=Epic`
    var opt = { jql: jqlStr };
   return jira.search.search(opt).then(epic => {
        console.log(epic);
        return makeJsonEpic(epic.issues).then(function(jsonStr) {
            console.log(jsonStr);
            return jsonStr
         });
    }).catch(function (err) {
        console.log(err);
        // API call failed...
        throw err;
    });
}

export const getStoryPointAndTimeEstimateKey = () => {
    let jsonValues = getProjectKeysJson();
    var jira = initJiraClient(jsonValues["projectjiraKey"]);

   return jira.field.getAllFields().then(fields => {
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
          return  getProjectEpic(jsonValues["projectjiraname"]).then(function(finalJsonEpicRes) {
                console.log(finalJsonEpicRes);
                return finalJsonEpicRes;
            });
        }
    }).catch(function (err) {
        // API call failed...
        throw err;
    });
}

export const getProjectKeysJson= () => {
    var jsonKeys = {};
   //  var jsonKeys = {"projectjiraKey": "node-data", "projectjiraname": "Node-Data", "email": "ravindra.patidar@talentica.com",
    // "api_token": "qUFeEOJEaD7ILyFgR0xb1057"}
    return jsonKeys;
}

getStoryPointAndTimeEstimateKey().then(function(res) {
    console.log(res);
});


