"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBranches = exports.printSummary = void 0;
const Terminal_1 = require("../Terminal");
function printSummary(features) {
    Terminal_1.default.log('Parsing complete\n');
    let featureCount = {};
    for (let feature of features) {
        featureCount[feature.type] = (featureCount[feature.type] || 0) + 1;
    }
    Terminal_1.default.log(featureCount);
    let hierarchyMap = {};
    for (let feature of features) {
        // generate a branch string for each branch
        let a = getBranches(feature);
        for (let branch of a) {
            hierarchyMap[branch] = (hierarchyMap[branch] || 0) + 1;
        }
    }
    for (let key in hierarchyMap) {
        Terminal_1.default.log(`${key}: ${hierarchyMap[key]}`);
    }
}
exports.printSummary = printSummary;
function getBranches(feature) {
    let localBranches = new Array();
    for (let child of feature.children) {
        let branchPrefix = `${feature.type}`;
        if (child.children.length > 0) {
            for (let childBranch of getBranches(child)) {
                let branch = `${branchPrefix}->${childBranch}`;
                localBranches.push(branch);
            }
        }
        else {
            localBranches.push(`${branchPrefix}->${child.type}`);
        }
    }
    return localBranches;
}
exports.getBranches = getBranches;
