/**
 * Notes: 兼职模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-03-23 04:00:00 
 */

const BaseProjectService = require('./base_project_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const ThingModel = require('../model/thing_model.js');
const UserModel = require('../model/user_model.js');

class ThingService extends BaseProjectService {

	getStatusDesc(thing) {
		if (!thing) return '';
		if (thing.THING_STATUS === 0 && thing.THING_END_TIME < this._timestamp) return '已过期';
		if (thing.THING_STATUS === 0) return '待接单';
		if (thing.THING_STATUS === 1) return '已接单';
		if (thing.THING_STATUS === 9) return '已完成';
		return '';
	}

	async acceptThing(userId, id) {
		await this.assertCanAcceptOrder(userId);
		let row = await ThingModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.THING_USER_ID === userId) this.AppError('不能接自己的单');
		if (row.THING_STATUS !== 0) this.AppError('该单已被接或已结束');
		if (row.THING_END_TIME < this._timestamp) this.AppError('该单已过期');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		let data = {
			THING_STATUS: 1,
			THING_ACCEPT_USER_ID: userId,
			THING_ACCEPT_USER_NAME: user ? user.USER_NAME : '',
			THING_ACCEPT_TIME: this._timestamp,
		};
		await ThingModel.edit(id, data);
	}

	async cancelThing(userId, id) {
		let row = await ThingModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.THING_ACCEPT_USER_ID !== userId) this.AppError('无权取消');
		if (row.THING_STATUS !== 1) this.AppError('当前状态不可取消');

		await ThingModel.edit(id, {
			THING_STATUS: 0,
			THING_ACCEPT_USER_ID: '',
			THING_ACCEPT_USER_NAME: '',
			THING_ACCEPT_TIME: 0,
		});
	}

	async viewThing(id) {
		let where = { _id: id };
		let thing = await ThingModel.getOne(where, '*');
		if (!thing) return null;

		if (thing.THING_STATUS > 0 && thing.THING_ACCEPT_USER_ID) {
			thing.acceptUser = await UserModel.getOne({ USER_MINI_OPENID: thing.THING_ACCEPT_USER_ID }, 'USER_NAME,USER_MOBILE');
		}

		ThingModel.inc(id, 'THING_VIEW_CNT', 1);

		return thing;
	}

	async getThingDetail(id) {
		return await ThingModel.getOne(id);
	}

	async statusThing(userId, id, status) {
		let row = await ThingModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		status = Number(status);

		if (userId === null || userId === undefined) {
			let data = { THING_STATUS: status };
			if (status === 9) data.THING_OVER_TIME = this._timestamp;
			await ThingModel.edit(id, data);
			return;
		}

		if (status === 9) {
			if (row.THING_ACCEPT_USER_ID !== userId) this.AppError('无权操作');
			if (row.THING_STATUS !== 1) this.AppError('当前状态不可完成');
			await ThingModel.edit(id, {
				THING_STATUS: 9,
				THING_OVER_TIME: this._timestamp,
			});
			return;
		}

		this.AppError('无权操作');
	}

	async delThing(userId, id) {
		let row = await ThingModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (userId && row.THING_USER_ID !== userId) this.AppError('无权删除');
		await ThingModel.del(id);
	}

	async insertThing(userId, {
		cateId,
		cateName,
		order,
		end,
		forms
	}) {
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		let endTime = timeUtil.time2Timestamp(String(end).trim());
		if (isNaN(endTime)) this.AppError('截止时间格式错误');
		if (endTime <= this._timestamp) this.AppError('接单截止时间须晚于当前时间');

		let obj = dataUtil.dbForms2Obj(forms);
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		let data = {
			THING_USER_ID: userId,
			THING_USER_NAME: user ? user.USER_NAME : '',
			THING_CATE_ID: String(cateId),
			THING_CATE_NAME: cateName ? String(cateName) : '',
			THING_ORDER: Number(order),
			THING_END_TIME: endTime,
			THING_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			THING_STATUS: 0,
			THING_FORMS: forms,
			THING_OBJ: obj,
			THING_VOUCH: voucher,
		};

		let id = await ThingModel.insert(data);
		return { id };
	}

	async editThing(userId, {
		id,
		cateId,
		cateName,
		order,
		end,
		forms
	}) {
		let row = await ThingModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.THING_USER_ID !== userId) this.AppError('无权修改');
		if (row.THING_STATUS !== 0) this.AppError('已接单或已结束，无法修改');
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let endTime = timeUtil.time2Timestamp(String(end).trim());
		if (isNaN(endTime)) this.AppError('截止时间格式错误');
		if (endTime <= this._timestamp) this.AppError('接单截止时间须晚于当前时间');

		let obj = dataUtil.dbForms2Obj(forms);
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		await ThingModel.edit(id, {
			THING_CATE_ID: String(cateId),
			THING_CATE_NAME: cateName ? String(cateName) : '',
			THING_ORDER: Number(order),
			THING_END_TIME: endTime,
			THING_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			THING_FORMS: forms,
			THING_OBJ: obj,
			THING_VOUCH: voucher,
		});
	}

	async updateThingForms({
		id,
		hasImageForms
	}) {
		await ThingModel.editForms({ _id: id }, 'THING_FORMS', 'THING_OBJ', hasImageForms);
	}

	async getThingList(userId, {
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
			'THING_ORDER': 'asc',
			'THING_ADD_TIME': 'desc'
		};
		let fields = 'THING_USER_ID,THING_ACCEPT_USER_ID,THING_END_TIME,THING_STATUS,THING_ADD_TIME,THING_USER_ID,THING_OBJ,user.USER_PIC';

		let where = {};
		where.and = {
			_pid: this.getProjectId()
		};


		if (util.isDefined(search) && search) {
			if (search == '我的发布') {
				where.and.THING_USER_ID = userId;
			}
			else if (search == '我的接单') {
				where.and.THING_ACCEPT_USER_ID = userId;
			}
			else if (search == '我的收藏') {
				where.and.THING_FAV_LIST = userId;
			}

			else {
				where.or = [
					{ 'THING_OBJ.title': ['like', search] },
					{ 'THING_OBJ.poster': ['like', search] },
					{ 'THING_OBJ.tel': ['like', search] },
				];
			}

		} else if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'cateId': {
					where.and.THING_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.THING_STATUS = Number(sortVal);
					break;
				}
				case 'timeout': {
					where.and.THING_STATUS = 0;
					where.and.THING_END_TIME = ['<', this._timestamp]
					break;
				}
				case 'wait': {
					where.and.THING_STATUS = 0;
					where.and.THING_END_TIME = ['>=', this._timestamp]
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'THING_ADD_TIME');
					break;
				}
			}
		}

		let joinParams = {
			from: UserModel.CL,
			localField: 'THING_USER_ID',
			foreignField: 'USER_MINI_OPENID',
			as: 'user',
		};

		return await ThingModel.getListJoin(joinParams, where, fields, orderBy, page, size, isTotal, oldTotal);

	}

}

module.exports = ThingService;
