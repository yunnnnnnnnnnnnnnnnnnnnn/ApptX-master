/**
 * Notes: 后台商家管理
 */

const BaseProjectAdminController = require('./base_project_admin_controller.js');
const AdminShopService = require('../../service/admin/admin_shop_service.js');

class AdminShopController extends BaseProjectAdminController {

	async getShopList() {
		await this.isAdmin();
		let rules = {
			search: 'string|name=搜索',
			page: 'must|int|default=1',
			size: 'int',
			isTotal: 'bool',
			oldTotal: 'int',
		};
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.getShopList(input);
	}

	async insertShop() {
		await this.isAdmin();
		let rules = {
			name: 'must|string|name=商家名称',
			addr: 'string|name=地址',
			desc: 'string|name=简介',
			pic: 'string|name=图片',
			order: 'int|name=排序',
		};
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.insertShop(input);
	}

	async editShop() {
		await this.isAdmin();
		let rules = {
			id: 'must|id',
			name: 'must|string|name=商家名称',
			addr: 'string|name=地址',
			desc: 'string|name=简介',
			pic: 'string|name=图片',
			order: 'int|name=排序',
			status: 'int|name=状态',
		};
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.editShop(input);
	}

	async delShop() {
		await this.isAdmin();
		let rules = { id: 'must|id' };
		let input = this.validateData(rules);
		let service = new AdminShopService();
		await service.delShop(input.id);
	}

	async getGoodList() {
		await this.isAdmin();
		let rules = { shopId: 'must|id|name=商家' };
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.getGoodList(input.shopId);
	}

	async insertGood() {
		await this.isAdmin();
		let rules = {
			shopId: 'must|id|name=商家',
			name: 'must|string|name=商品名',
			price: 'must|digit|name=单价',
			order: 'int|name=排序',
		};
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.insertGood(input);
	}

	async editGood() {
		await this.isAdmin();
		let rules = {
			id: 'must|id',
			name: 'must|string|name=商品名',
			price: 'must|digit|name=单价',
			order: 'int|name=排序',
			status: 'int|name=状态',
		};
		let input = this.validateData(rules);
		let service = new AdminShopService();
		return await service.editGood(input);
	}

	async delGood() {
		await this.isAdmin();
		let rules = { id: 'must|id' };
		let input = this.validateData(rules);
		let service = new AdminShopService();
		await service.delGood(input.id);
	}
}

module.exports = AdminShopController;
