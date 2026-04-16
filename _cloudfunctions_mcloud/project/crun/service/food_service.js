/**
 * Notes: 兼职模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-03-23 04:00:00 
 */

const BaseProjectService = require('./base_project_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const FoodModel = require('../model/food_model.js');
const UserModel = require('../model/user_model.js');

class FoodService extends BaseProjectService {

	getStatusDesc(food) {
		if (!food) return '';
		if (food.FOOD_STATUS === 0 && food.FOOD_END_TIME < this._timestamp) return '已过期';
		if (food.FOOD_STATUS === 0) return '待接单';
		if (food.FOOD_STATUS === 1) return '已接单';
		if (food.FOOD_STATUS === 9) return '已完成';
		return '';
	}

	async acceptFood(userId, id) {
		await this.assertCanAcceptOrder(userId);
		let row = await FoodModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOOD_USER_ID === userId) this.AppError('不能接自己的单');
		if (row.FOOD_STATUS !== 0) this.AppError('该单已被接或已结束');
		if (row.FOOD_END_TIME < this._timestamp) this.AppError('该单已过期');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		await FoodModel.edit(id, {
			FOOD_STATUS: 1,
			FOOD_ACCEPT_USER_ID: userId,
			FOOD_ACCEPT_USER_NAME: user ? user.USER_NAME : '',
			FOOD_ACCEPT_TIME: this._timestamp,
		});
	}

	async cancelFood(userId, id) {
		let row = await FoodModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOOD_ACCEPT_USER_ID !== userId) this.AppError('无权取消');
		if (row.FOOD_STATUS !== 1) this.AppError('当前状态不可取消');

		await FoodModel.edit(id, {
			FOOD_STATUS: 0,
			FOOD_ACCEPT_USER_ID: '',
			FOOD_ACCEPT_USER_NAME: '',
			FOOD_ACCEPT_TIME: 0,
		});
	}

	async viewFood(id) {
		let food = await FoodModel.getOne({ _id: id }, '*');
		if (!food) return null;

		if (food.FOOD_STATUS > 0 && food.FOOD_ACCEPT_USER_ID) {
			food.acceptUser = await UserModel.getOne({ USER_MINI_OPENID: food.FOOD_ACCEPT_USER_ID }, 'USER_NAME,USER_MOBILE');
		}

		FoodModel.inc(id, 'FOOD_VIEW_CNT', 1);

		return food;
	}

	async getFoodDetail(id) {
		return await FoodModel.getOne(id);
	}

	async statusFood(userId, id, status) {
		let row = await FoodModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		status = Number(status);

		if (userId === null || userId === undefined) {
			let data = { FOOD_STATUS: status };
			if (status === 9) data.FOOD_OVER_TIME = this._timestamp;
			await FoodModel.edit(id, data);
			return;
		}

		if (status === 9) {
			if (row.FOOD_ACCEPT_USER_ID !== userId) this.AppError('无权操作');
			if (row.FOOD_STATUS !== 1) this.AppError('当前状态不可完成');
			await FoodModel.edit(id, {
				FOOD_STATUS: 9,
				FOOD_OVER_TIME: this._timestamp,
			});
			return;
		}

		this.AppError('无权操作');
	}

	async delFood(userId, id) {
		let row = await FoodModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (userId && row.FOOD_USER_ID !== userId) this.AppError('无权删除');
		await FoodModel.del(id);
	}

	async insertFood(userId, {
		cateId,
		cateName,
		order,
		end,
		forms,
		shopId,
		shopName,
		goodsPick
	}) {
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		let endTime = timeUtil.time2Timestamp(String(end).trim());
		if (isNaN(endTime)) this.AppError('截止时间格式错误');
		if (endTime <= this._timestamp) this.AppError('接单截止时间须晚于当前时间');

		let obj = dataUtil.dbForms2Obj(forms);
		if (util.isDefined(shopId) && shopId) {
			obj.shopId = String(shopId);
			obj.shopName = shopName ? String(shopName) : '';
			obj.goodsPick = Array.isArray(goodsPick) ? goodsPick : [];
		}
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		let data = {
			FOOD_USER_ID: userId,
			FOOD_USER_NAME: user ? user.USER_NAME : '',
			FOOD_CATE_ID: String(cateId),
			FOOD_CATE_NAME: cateName ? String(cateName) : '',
			FOOD_ORDER: Number(order),
			FOOD_END_TIME: endTime,
			FOOD_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			FOOD_STATUS: 0,
			FOOD_FORMS: forms,
			FOOD_OBJ: obj,
			FOOD_VOUCH: voucher,
		};

		let id = await FoodModel.insert(data);
		return { id };
	}

	async editFood(userId, {
		id,
		cateId,
		cateName,
		order,
		end,
		forms,
		shopId,
		shopName,
		goodsPick
	}) {
		let row = await FoodModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOOD_USER_ID !== userId) this.AppError('无权修改');
		if (row.FOOD_STATUS !== 0) this.AppError('已接单或已结束，无法修改');
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let endTime = timeUtil.time2Timestamp(String(end).trim());
		if (isNaN(endTime)) this.AppError('截止时间格式错误');
		if (endTime <= this._timestamp) this.AppError('接单截止时间须晚于当前时间');

		let obj = dataUtil.dbForms2Obj(forms);
		if (util.isDefined(shopId) && shopId) {
			obj.shopId = String(shopId);
			obj.shopName = shopName ? String(shopName) : '';
			obj.goodsPick = Array.isArray(goodsPick) ? goodsPick : [];
		}
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		await FoodModel.edit(id, {
			FOOD_CATE_ID: String(cateId),
			FOOD_CATE_NAME: cateName ? String(cateName) : '',
			FOOD_ORDER: Number(order),
			FOOD_END_TIME: endTime,
			FOOD_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			FOOD_FORMS: forms,
			FOOD_OBJ: obj,
			FOOD_VOUCH: voucher,
		});
	}

	async updateFoodForms({
		id,
		hasImageForms
	}) {
		await FoodModel.editForms({ _id: id }, 'FOOD_FORMS', 'FOOD_OBJ', hasImageForms);
	}

	async getFoodList(userId, {
		search,
		sortType,
		sortVal,
		orderBy,
		whereEx,
		page,
		size,
		isTotal = true,
		oldTotal }) {
		orderBy = orderBy || {
			'FOOD_ORDER': 'asc',
			'FOOD_ADD_TIME': 'desc'
		};
		let fields = 'FOOD_ACCEPT_USER_ID,FOOD_END_TIME,FOOD_STATUS,FOOD_ADD_TIME,FOOD_USER_ID,FOOD_OBJ';

		let where = {};
		where.and = {
			_pid: this.getProjectId()
		};


		if (util.isDefined(search) && search) {
			if (search == '我的发布') {
				where.and.FOOD_USER_ID = userId;
			}
			else if (search == '我的接单') {
				where.and.FOOD_ACCEPT_USER_ID = userId;
			}
			else if (search == '我的收藏') {
				where.and.FOOD_FAV_LIST = userId;
			}

			else {
				where.or = [
					{ 'FOOD_OBJ.title': ['like', search] },
					{ 'FOOD_OBJ.poster': ['like', search] },
					{ 'FOOD_OBJ.tel': ['like', search] },
				];
			}

		} else if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'cateId': {
					where.and.FOOD_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.FOOD_STATUS = Number(sortVal);
					break;
				}
				case 'timeout': {
					where.and.FOOD_STATUS = 0;
					where.and.FOOD_END_TIME = ['<', this._timestamp]
					break;
				}
				case 'wait': {
					where.and.FOOD_STATUS = 0;
					where.and.FOOD_END_TIME = ['>=', this._timestamp]
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'FOOD_ADD_TIME');
					break;
				}
			}
		}

		return await FoodModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

	}

}

module.exports = FoodService;
