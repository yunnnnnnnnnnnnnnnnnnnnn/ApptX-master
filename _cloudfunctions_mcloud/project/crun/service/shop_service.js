/**
 * Notes: 用户端商家展示
 */

const BaseProjectService = require('./base_project_service.js');
const ShopModel = require('../model/shop_model.js');
const ShopGoodModel = require('../model/shop_good_model.js');

class ShopService extends BaseProjectService {

	async getShopList() {
		let where = {
			and: {
				SHOP_STATUS: 1,
				_pid: this.getProjectId(),
			}
		};
		let orderBy = {
			SHOP_ORDER: 'asc',
			SHOP_ADD_TIME: 'desc'
		};
		let list = await ShopModel.getAll(where, 'SHOP_NAME,SHOP_ADDR,SHOP_PIC,SHOP_DESC', orderBy, 200);
		return { list: list || [] };
	}

	async getGoodsByShop(shopId) {
		if (!shopId) this.AppError('缺少商家ID');
		let shop = await ShopModel.getOne(shopId, 'SHOP_NAME,SHOP_ADDR,SHOP_STATUS,_pid');
		if (!shop || shop.SHOP_STATUS !== 1) this.AppError('商家不存在或已下架');
		if (shop._pid !== this.getProjectId()) this.AppError('商家不存在');

		let where = {
			GOOD_SHOP_ID: shopId,
			GOOD_STATUS: 1
		};
		let orderBy = { GOOD_ORDER: 'asc', GOOD_ADD_TIME: 'desc' };
		let list = await ShopGoodModel.getAll(where, 'GOOD_NAME,GOOD_PRICE', orderBy, 500);
		return {
			shop,
			list: list || []
		};
	}
}

module.exports = ShopService;
