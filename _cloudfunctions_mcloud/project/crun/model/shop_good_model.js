/**
 * Notes: 商家商品
 */

const BaseProjectModel = require('./base_project_model.js');

class ShopGoodModel extends BaseProjectModel { }

ShopGoodModel.CL = BaseProjectModel.C('shop_good');

ShopGoodModel.DB_STRUCTURE = {
	_pid: 'string|true',
	GOOD_ID: 'string|true',
	GOOD_SHOP_ID: 'string|true|comment=商家docId',
	GOOD_NAME: 'string|true',
	GOOD_PRICE: 'int|true|default=0|comment=单价分',
	GOOD_ORDER: 'int|true|default=9999',
	GOOD_STATUS: 'int|true|default=1|comment=1上架0下架',
	GOOD_ADD_TIME: 'int|true',
	GOOD_EDIT_TIME: 'int|true',
};

ShopGoodModel.FIELD_PREFIX = 'GOOD_';

module.exports = ShopGoodModel;
