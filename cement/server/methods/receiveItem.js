import {ReceiveItems} from '../../imports/api/collections/receiveItem';
Meteor.methods({
    fetchLastReceiveItems({id,ref,selfId}){
        let selector = {};
        selector[ref] = id;
        if(selfId) {
            selector._id = {$nin: [selfId]}
        }
        return ReceiveItems.findOne(selector, {sort: {receiveItemDate: -1}});
    }
});