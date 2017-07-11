import 'meteor/matb33:collection-hooks';
import {idGenerator} from 'meteor/theara:id-generator';

// Collection
import {AverageInventories} from '../../imports/api/collections/inventory.js';


AverageInventories.before.insert(function (userId, doc) {
    let prefix = doc.stockLocationId + '-';
    doc._id = idGenerator.genWithPrefix(AverageInventories, prefix, 13)
});

