/**
 * Notes: 合作商家
 */

const BaseProjectModel = require('./base_project_model.js');

class ShopModel extends BaseProjectModel { }

ShopModel.CL = BaseProjectModel.C('shop');

ShopModel.DB_STRUCTURE = {
	_pid: 'string|true',
	SHOP_ID: 'string|true',
	SHOP_NAME: 'string|true|comment=商家名称',
	SHOP_ADDR: 'string|false|comment=取货/商家地址',
	SHOP_DESC: 'string|false',
	SHOP_PIC: 'string|false',
	SHOP_ORDER: 'int|true|default=9999',
	SHOP_STATUS: 'int|true|default=1|comment=1上架0下架',
	SHOP_ADD_TIME: 'int|true',
	SHOP_EDIT_TIME: 'int|true',
};

ShopModel.FIELD_PREFIX = 'SHOP_';

module.exports = ShopModel;
