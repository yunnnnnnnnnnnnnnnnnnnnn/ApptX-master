/**
 * Notes: 陪替服务
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-05-16 04:00:00 
 */

const BaseProjectService = require('./base_project_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const FollowModel = require('../model/follow_model.js');
const UserModel = require('../model/user_model.js');

class FollowService extends BaseProjectService {

	getStatusDesc(follow) {
		if (!follow) return '';
		if (follow.FOLLOW_STATUS === 0 && follow.FOLLOW_END_TIME < this._timestamp) return '已过期';
		if (follow.FOLLOW_STATUS === 0) return '待接单';
		if (follow.FOLLOW_STATUS === 1) return '已接单';
		if (follow.FOLLOW_STATUS === 9) return '已完成';
		return '';
	}

	async acceptFollow(userId, id) {
		await this.assertCanAcceptOrder(userId);
		let row = await FollowModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOLLOW_USER_ID === userId) this.AppError('不能接自己的单');
		if (row.FOLLOW_STATUS !== 0) this.AppError('该单已被接或已结束');
		if (row.FOLLOW_END_TIME < this._timestamp) this.AppError('该单已过期');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		await FollowModel.edit(id, {
			FOLLOW_STATUS: 1,
			FOLLOW_ACCEPT_USER_ID: userId,
			FOLLOW_ACCEPT_USER_NAME: user ? user.USER_NAME : '',
			FOLLOW_ACCEPT_TIME: this._timestamp,
		});
	}

	async cancelFollow(userId, id) {
		let row = await FollowModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOLLOW_ACCEPT_USER_ID !== userId) this.AppError('无权取消');
		if (row.FOLLOW_STATUS !== 1) this.AppError('当前状态不可取消');

		await FollowModel.edit(id, {
			FOLLOW_STATUS: 0,
			FOLLOW_ACCEPT_USER_ID: '',
			FOLLOW_ACCEPT_USER_NAME: '',
			FOLLOW_ACCEPT_TIME: 0,
		});
	}

	async viewFollow(id) {
		let follow = await FollowModel.getOne({ _id: id }, '*');
		if (!follow) return null;

		if (follow.FOLLOW_STATUS > 0 && follow.FOLLOW_ACCEPT_USER_ID) {
			follow.acceptUser = await UserModel.getOne({ USER_MINI_OPENID: follow.FOLLOW_ACCEPT_USER_ID }, 'USER_NAME,USER_MOBILE');
		}

		FollowModel.inc(id, 'FOLLOW_VIEW_CNT', 1);

		return follow;
	}

	async getFollowDetail(id) {
		return await FollowModel.getOne(id);
	}

	async statusFollow(userId, id, status) {
		let row = await FollowModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		status = Number(status);

		if (userId === null || userId === undefined) {
			let data = { FOLLOW_STATUS: status };
			if (status === 9) data.FOLLOW_OVER_TIME = this._timestamp;
			await FollowModel.edit(id, data);
			return;
		}

		if (status === 9) {
			if (row.FOLLOW_ACCEPT_USER_ID !== userId) this.AppError('无权操作');
			if (row.FOLLOW_STATUS !== 1) this.AppError('当前状态不可完成');
			await FollowModel.edit(id, {
				FOLLOW_STATUS: 9,
				FOLLOW_OVER_TIME: this._timestamp,
			});
			return;
		}

		this.AppError('无权操作');
	}

	async delFollow(userId, id) {
		let row = await FollowModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (userId && row.FOLLOW_USER_ID !== userId) this.AppError('无权删除');
		await FollowModel.del(id);
	}

	async insertFollow(userId, {
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
			FOLLOW_USER_ID: userId,
			FOLLOW_USER_NAME: user ? user.USER_NAME : '',
			FOLLOW_CATE_ID: String(cateId),
			FOLLOW_CATE_NAME: cateName ? String(cateName) : '',
			FOLLOW_ORDER: Number(order),
			FOLLOW_END_TIME: endTime,
			FOLLOW_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			FOLLOW_STATUS: 0,
			FOLLOW_FORMS: forms,
			FOLLOW_OBJ: obj,
			FOLLOW_VOUCH: voucher,
		};

		let id = await FollowModel.insert(data);
		return { id };
	}

	async editFollow(userId, {
		id,
		cateId,
		cateName,
		order,
		end,
		forms
	}) {
		let row = await FollowModel.getOne(id);
		if (!row) this.AppError('记录不存在');
		if (row.FOLLOW_USER_ID !== userId) this.AppError('无权修改');
		if (row.FOLLOW_STATUS !== 0) this.AppError('已接单或已结束，无法修改');
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

		await FollowModel.edit(id, {
			FOLLOW_CATE_ID: String(cateId),
			FOLLOW_CATE_NAME: cateName ? String(cateName) : '',
			FOLLOW_ORDER: Number(order),
			FOLLOW_END_TIME: endTime,
			FOLLOW_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			FOLLOW_FORMS: forms,
			FOLLOW_OBJ: obj,
			FOLLOW_VOUCH: voucher,
		});
	}

	async updateFollowForms({
		id,
		hasImageForms
	}) {
		await FollowModel.editForms({ _id: id }, 'FOLLOW_FORMS', 'FOLLOW_OBJ', hasImageForms);
	}

	async getFollowList(userId, {
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
			'FOLLOW_ORDER': 'asc',
			'FOLLOW_ADD_TIME': 'desc'
		};
		let fields = 'FOLLOW_ACCEPT_USER_ID,FOLLOW_END_TIME,FOLLOW_STATUS,FOLLOW_ADD_TIME,FOLLOW_USER_ID,FOLLOW_OBJ';

		let where = {};
		where.and = {
			_pid: this.getProjectId()
		};


		if (util.isDefined(search) && search) {
			if (search == '我的发布') {
				where.and.FOLLOW_USER_ID = userId;
			}
			else if (search == '我的接单') {
				where.and.FOLLOW_ACCEPT_USER_ID = userId;
			}
			else if (search == '我的收藏') {
				where.and.FOLLOW_FAV_LIST = userId;
			}

			else {
				where.or = [
					{ 'FOLLOW_OBJ.title': ['like', search] },
					{ 'FOLLOW_OBJ.poster': ['like', search] },
					{ 'FOLLOW_OBJ.tel': ['like', search] },
				];
			}

		} else if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'cateId': {
					where.and.FOLLOW_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.FOLLOW_STATUS = Number(sortVal);
					break;
				}
				case 'timeout': {
					where.and.FOLLOW_STATUS = 0;
					where.and.FOLLOW_END_TIME = ['<', this._timestamp]
					break;
				}
				case 'wait': {
					where.and.FOLLOW_STATUS = 0;
					where.and.FOLLOW_END_TIME = ['>=', this._timestamp]
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'FOLLOW_ADD_TIME');
					break;
				}
			}
		}

		return await FollowModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

	}

}

module.exports = FollowService;
