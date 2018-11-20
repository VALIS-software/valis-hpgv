import { Feature } from 'genomics-formats/lib/gff3/Feature';
import Terminal from '../Terminal';

export function printSummary(features: Iterable<Feature>) {
    Terminal.log('Parsing complete\n');

    let featureCount: { [key: string]: number } = {}
    for (let feature of features) {
        featureCount[feature.type] = (featureCount[feature.type] || 0) + 1;
    }

    Terminal.log(featureCount);

    let hierarchyMap: { [key: string]: number } = {};

    for (let feature of features) {
        // generate a branch string for each branch
        let a = getBranches(feature);

        for (let branch of a) {
            hierarchyMap[branch] = (hierarchyMap[branch] || 0) + 1;
        }
    }

    for (let key in hierarchyMap) {
        Terminal.log(`${key}: ${hierarchyMap[key]}`);
    }
}

export function getBranches(feature: Feature): Array<string> {
    let localBranches = new Array<string>();

    for (let child of feature.children) {
        let branchPrefix = `${feature.type}`;

        if (child.children.length > 0) {
            for (let childBranch of getBranches(child)) {
                let branch = `${branchPrefix}->${childBranch}`;
                localBranches.push(branch);
            }
        } else {
            localBranches.push(`${branchPrefix}->${child.type}`);
        }
    }

    return localBranches;
}