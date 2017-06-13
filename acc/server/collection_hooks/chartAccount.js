import 'meteor/matb33:collection-hooks';
import {idGenerator} from 'meteor/theara:id-generator';

// Collection
import {ChartAccount} from '../../imports/api/collections/chartAccount.js';

import {MapClosing} from '../../imports/api/collections/mapCLosing';
import {MapFixAsset} from '../../imports/api/collections/mapFixAsset';

import {MapUserAndAccount} from '../../imports/api/collections/mapUserAndAccount';
import {PaymentReceiveMethod} from '../../imports/api/collections/paymentReceiveMethod';
import {Journal} from '../../imports/api/collections/journal';
import {FixAssetExpense} from '../../imports/api/collections/fixAssetExpense';
import {FixAssetDep} from '../../imports/api/collections/fixAssetDep';
import {DepExpList} from '../../imports/api/collections/depExpList';
import {CloseChartAccount} from '../../imports/api/collections/closeChartAccount';
import {CloseChartAccountPerMonth} from '../../imports/api/collections/closeChartAccountPerMonth';

import {AccountMapping} from '../../../cement/imports/api/collections/accountMapping';
import {SpaceChar} from "../../common/configs/space";


ChartAccount.before.insert(function (userId, doc) {
    Meteor.call('checkParent', doc.parentId, function (err, checkParent) {
        if (err) {
        } else {
            if (checkParent != null) {
                //generate add zero
                doc.code = s.pad(doc.code, 5, "0");
                /*  doc.name = checkParent.name + " : " + doc.name;*/
                doc.level = checkParent.level + 1;
            } else {
                doc.code = s.pad(doc.code, 5, "0");
                doc.level = 0;
            }
        }
    });
    doc._id = idGenerator.gen(ChartAccount, 3);
});

ChartAccount.before.update(function (userId, doc, fieldNames, modifier, options) {
    Meteor.call('checkParent', modifier.$set.parentId, function (err, checkParent) {
        if (err) {
        } else {
            if (checkParent != null) {
                //generate add zero
                modifier.$set.code = s.pad(modifier.$set.code, 5, "0");
                /*  doc.name = checkParent.name + " : " + doc.name;*/
                modifier.$set.level = checkParent.level + 1;
            } else {
                modifier.$set.code = s.pad(modifier.$set.code, 5, "0");
                modifier.$set.level = 0;
            }
        }
    });

});

ChartAccount.after.update(function (userId, doc, fieldNames, modifier, options) {
    let oldData = this.previous;

    //Map Journal
    Journal.direct.update({'transaction.accountDoc._id': doc._id}, {
        $set: {
            'transaction.$.accountDoc': doc,
            'transaction.$.account': doc.code + " | " + doc.name
        }
    }, {multi: true});
    Journal.direct.update({'transactionAsset.account': oldData.code + " | " + oldData.name}, {$set: {'transactionAsset.$.account': doc.code + " | " + doc.name}}, {multi: true});
    //Map Closing
    MapClosing.direct.update({'accountDoc._id': doc._id}, {
        $set: {
            accountDoc: doc,
        }
    }, {multi: true});

    //Map Fix Asset
    MapFixAsset.direct.update({'accuFixAssetDoc._id': doc._id}, {
        $set: {
            accuFixAssetDoc: doc,
        }
    }, {multi: true});

    MapFixAsset.direct.update({'fixAssetDoc._id': doc._id}, {
        $set: {
            fixAssetDoc: doc,
            fixAssetCon: doc.code + " | " + doc.name
        }
    }, {multi: true});

    MapFixAsset.direct.update({'fixAssetExpenseDoc._id': doc._id}, {
        $set: {
            fixAssetExpenseDoc: doc
        }
    }, {multi: true});

    //Map User and Account
    MapUserAndAccount.direct.update({'transaction.accountDoc._id': doc._id}, {
        $set: {
            'transaction.$.accountDoc': doc,
            'transaction.$.chartAccount': doc.code + " | " + doc.name
        }
    }, {multi: true});

    //Payment Receive Method
    PaymentReceiveMethod.direct.update({'accountDoc._id': doc._id}, {
        $set: {
            accountDoc: doc
        }
    }, {multi: true});
    //FixAssetExpense
    FixAssetExpense.direct.update({'transactionExpense.account': oldData.code + " | " + oldData.name,}, {
        $set: {
            'transactionExpense.$.account': doc.code + " | " + doc.name
        }
    }, {multi: true});

    //FixAsset Dep
    FixAssetDep.direct.update({'transactionAsset.account': oldData.code + " | " + oldData.name}, {
        $set: {
            'transactionAsset.$.account': doc.code + " | " + doc.name
        }
    }, {multi: true});
    //DepExpList
    DepExpList.direct.update({account: oldData.code + " | " + oldData.name}, {
        $set: {
            account: doc.code + " | " + doc.name
        }
    }, {multi: true});


    //CloseChartAccount
    let setObjCloseChartAccount = {};
    if (doc.parentId != undefined) {
        setObjCloseChartAccount = {
            accountTypeId: doc.accountTypeId,
            code: doc.code,
            name: doc.name,
            parentId: doc.parentId,
            level: doc.level
        }
    } else {
        setObjCloseChartAccount = {
            accountTypeId: doc.accountTypeId,
            code: doc.code,
            name: doc.name
        }
    }

    CloseChartAccount.direct.update({closeChartAccountId: doc._id}, {
        $set: setObjCloseChartAccount
    }, {multi: true});

    //CloseChartAccountPerMonth

    let setObjCloseChartAccountPerMonth = {};
    if (doc.parentId != undefined) {
        setObjCloseChartAccountPerMonth = {
            accountTypeId: doc.accountTypeId,
            code: doc.code,
            name: doc.name,
            parentId: doc.parentId,
            level: doc.level
        }

    } else {
        setObjCloseChartAccountPerMonth = {
            accountTypeId: doc.accountTypeId,
            code: doc.code,
            name: doc.name
        }
    }

    CloseChartAccountPerMonth.direct.update({closeChartAccountId: doc._id}, {
        $set: setObjCloseChartAccountPerMonth
    }, {multi: true});


    //CloseChartAccountPerMonth
    let isTrue = AccountMapping.direct.update({account: oldData.code + " | " + oldData.name}, {
        $set: {
            account: doc.code + " | " + doc.name
        }
    }, {multi: true});


})



