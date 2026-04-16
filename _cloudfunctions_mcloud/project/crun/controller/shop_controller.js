/**
 * Notes: 商家（用户端）
 */

const BaseProjectController = require('./base_project_controller.js');
const ShopService = require('../service/shop_service.js');

class ShopController extends BaseProjectController {

	async getShopList() {
		let service = new ShopService();
		return await service.getShopList();
	}

	async getShopGoods() {
		let rules = {
			shopId: 'must|id|name=商家',
		};
		let input = this.validateData(rules);
		let service = new ShopService();
		return await service.getGoodsByShop(input.shopId);
	}
}

module.exports = ShopController;
