/**
 * Notes: 后台商家与商品
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const util = require('../../../../framework/utils/util.js');
const ShopModel = require('../../model/shop_model.js');
const ShopGoodModel = require('../../model/shop_good_model.js');

class AdminShopService extends BaseProjectAdminService {

	async getShopList({
		search,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {
		let orderBy = { SHOP_ORDER: 'asc', SHOP_ADD_TIME: 'desc' };
		let fields = 'SHOP_NAME,SHOP_ADDR,SHOP_STATUS,SHOP_ORDER,SHOP_ADD_TIME';
		let where = { and: { _pid: this.getProjectId() } };
		if (util.isDefined(search) && search) {
			where.or = [
				{ SHOP_NAME: ['like', search] },
				{ SHOP_ADDR: ['like', search] },
			];
		}
		return await ShopModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}

	async insertShop({
		name,
		addr,
		desc,
		pic,
		order
	}) {
		let data = {
			SHOP_NAME: String(name).trim(),
			SHOP_ADDR: addr ? String(addr).trim() : '',
			SHOP_DESC: desc ? String(desc).trim() : '',
			SHOP_PIC: pic ? String(pic) : '',
			SHOP_ORDER: util.isDefined(order) ? Number(order) : 9999,
			SHOP_STATUS: 1,
		};
		let id = await ShopModel.insert(data);
		return { id };
	}

	async editShop({
		id,
		name,
		addr,
		desc,
		pic,
		order,
		status
	}) {
		let data = {
			SHOP_NAME: String(name).trim(),
			SHOP_ADDR: addr ? String(addr).trim() : '',
			SHOP_DESC: desc ? String(desc).trim() : '',
			SHOP_PIC: pic ? String(pic) : '',
			SHOP_ORDER: util.isDefined(order) ? Number(order) : 9999,
		};
		if (util.isDefined(status)) data.SHOP_STATUS = Number(status);
		await ShopModel.edit(id, data);
	}

	async delShop(id) {
		let goods = await ShopGoodModel.getAll({ GOOD_SHOP_ID: id }, '_id', {}, 500);
		if (goods && goods.length) {
			for (let g of goods) {
				await ShopGoodModel.del(g._id);
			}
		}
		await ShopModel.del(id);
	}

	async getGoodList(shopId) {
		let where = { GOOD_SHOP_ID: shopId };
		let orderBy = { GOOD_ORDER: 'asc', GOOD_ADD_TIME: 'desc' };
		let list = await ShopGoodModel.getAll(where, '*', orderBy, 500);
		return { list: list || [] };
	}

	async insertGood({
		shopId,
		name,
		price,
		order
	}) {
		let data = {
			GOOD_SHOP_ID: shopId,
			GOOD_NAME: String(name).trim(),
			GOOD_PRICE: Math.round(Number(price) * 100),
			GOOD_ORDER: util.isDefined(order) ? Number(order) : 9999,
			GOOD_STATUS: 1,
		};
		if (isNaN(data.GOOD_PRICE) || data.GOOD_PRICE < 0) this.AppError('价格不正确');
		let id = await ShopGoodModel.insert(data);
		return { id };
	}

	async editGood({
		id,
		name,
		price,
		order,
		status
	}) {
		let data = {
			GOOD_NAME: String(name).trim(),
			GOOD_PRICE: Math.round(Number(price) * 100),
			GOOD_ORDER: util.isDefined(order) ? Number(order) : 9999,
		};
		if (isNaN(data.GOOD_PRICE) || data.GOOD_PRICE < 0) this.AppError('价格不正确');
		if (util.isDefined(status)) data.GOOD_STATUS = Number(status);
		await ShopGoodModel.edit(id, data);
	}

	async delGood(id) {
		await ShopGoodModel.del(id);
	}
}

module.exports = AdminShopService;
