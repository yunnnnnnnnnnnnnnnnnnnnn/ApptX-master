/**
 * Notes: 兼职模块业务逻辑
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date: 2024-03-23 04:00:00 
 */

const BaseProjectService = require('./base_project_service.js');
const dataUtil = require('../../../framework/utils/data_util.js');
const timeUtil = require('../../../framework/utils/time_util.js');
const util = require('../../../framework/utils/util.js');
const cloudUtil = require('../../../framework/cloud/cloud_util.js');
const MailModel = require('../model/mail_model.js');
const UserModel = require('../model/user_model.js');

class MailService extends BaseProjectService {

	// 获取当前状态
	getStatusDesc(mail) {
		if (!mail) return '';
		if (mail.MAIL_STATUS === 0 && mail.MAIL_END_TIME < this._timestamp) return '已过期';
		if (mail.MAIL_STATUS === 0) return '待接单';
		if (mail.MAIL_STATUS === 1) return '已接单';
		if (mail.MAIL_STATUS === 9) return '已完成';
		return '';
	}

	/** 接单 */
	async acceptMail(userId, id) {
		await this.assertCanAcceptOrder(userId);
		let mail = await MailModel.getOne(id);
		if (!mail) this.AppError('记录不存在');
		if (mail.MAIL_USER_ID === userId) this.AppError('不能接自己的单');
		if (mail.MAIL_STATUS !== 0) this.AppError('该单已被接或已结束');
		if (mail.MAIL_END_TIME < this._timestamp) this.AppError('该单已过期');

		let user = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_NAME');
		let data = {
			MAIL_STATUS: 1,
			MAIL_ACCEPT_USER_ID: userId,
			MAIL_ACCEPT_USER_NAME: user ? user.USER_NAME : '',
			MAIL_ACCEPT_TIME: this._timestamp,
		};
		await MailModel.edit(id, data);
	}

	/** 取消我的订单 */
	async cancelMail(userId, id) {
		let mail = await MailModel.getOne(id);
		if (!mail) this.AppError('记录不存在');
		if (mail.MAIL_ACCEPT_USER_ID !== userId) this.AppError('无权取消');
		if (mail.MAIL_STATUS !== 1) this.AppError('当前状态不可取消');

		let data = {
			MAIL_STATUS: 0,
			MAIL_ACCEPT_USER_ID: '',
			MAIL_ACCEPT_USER_NAME: '',
			MAIL_ACCEPT_TIME: 0,
		};
		await MailModel.edit(id, data);
	}

	/** 浏览 */
	async viewMail(id) {
		let fields = '*';

		let where = {
			_id: id,
			//MAIL_STATUS: 1
		}

		let mail = await MailModel.getOne(where, fields);
		if (!mail) return null;

		// 接单人信息
		if (mail.MAIL_STATUS > 0 && mail.MAIL_ACCEPT_USER_ID) {
			mail.acceptUser = await UserModel.getOne({ USER_MINI_OPENID: mail.MAIL_ACCEPT_USER_ID }, 'USER_NAME,USER_MOBILE');
		}

		MailModel.inc(id, 'MAIL_VIEW_CNT', 1);

		return mail;
	}

	/** 获取 */
	async getMailDetail(id) {
		return await MailModel.getOne(id);
	}

	/**修改状态 */
	async statusMail(userId, id, status) {
		let mail = await MailModel.getOne(id);
		if (!mail) this.AppError('记录不存在');
		status = Number(status);

		if (userId === null || userId === undefined) {
			let data = { MAIL_STATUS: status };
			if (status === 9) data.MAIL_OVER_TIME = this._timestamp;
			await MailModel.edit(id, data);
			return;
		}

		if (status === 9) {
			if (mail.MAIL_ACCEPT_USER_ID !== userId) this.AppError('无权操作');
			if (mail.MAIL_STATUS !== 1) this.AppError('当前状态不可完成');
			await MailModel.edit(id, {
				MAIL_STATUS: 9,
				MAIL_OVER_TIME: this._timestamp,
			});
			return;
		}

		this.AppError('无权操作');
	}

	/** 删除 */
	async delMail(userId, id) {
		let mail = await MailModel.getOne(id);
		if (!mail) this.AppError('记录不存在');
		if (userId && mail.MAIL_USER_ID !== userId) this.AppError('无权删除');
		await MailModel.del(id);
	}

	/** 插入 */
	async insertMail(userId, {
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
			MAIL_USER_ID: userId,
			MAIL_USER_NAME: user ? user.USER_NAME : '',
			MAIL_CATE_ID: String(cateId),
			MAIL_CATE_NAME: cateName ? String(cateName) : '',
			MAIL_ORDER: Number(order),
			MAIL_END_TIME: endTime,
			MAIL_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			MAIL_STATUS: 0,
			MAIL_FORMS: forms,
			MAIL_OBJ: obj,
			MAIL_VOUCH: voucher,
		};

		let id = await MailModel.insert(data);
		return { id };
	}

	/** 修改 */
	async editMail(userId, {
		id,
		cateId,
		cateName,
		order,
		end,
		forms
	}) {
		let mail = await MailModel.getOne(id);
		if (!mail) this.AppError('记录不存在');
		if (mail.MAIL_USER_ID !== userId) this.AppError('无权修改');
		if (mail.MAIL_STATUS !== 0) this.AppError('已接单或已结束，无法修改');
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

		let data = {
			MAIL_CATE_ID: String(cateId),
			MAIL_CATE_NAME: cateName ? String(cateName) : '',
			MAIL_ORDER: Number(order),
			MAIL_END_TIME: endTime,
			MAIL_DAY: timeUtil.timestamp2Time(endTime, 'Y-M-D'),
			MAIL_FORMS: forms,
			MAIL_OBJ: obj,
			MAIL_VOUCH: voucher,
		};

		await MailModel.edit(id, data);
	}

	/** 更新forms信息 */
	async updateMailForms({
		id,
		hasImageForms
	}) {
		await MailModel.editForms({ _id: id }, 'MAIL_FORMS', 'MAIL_OBJ', hasImageForms);
	}

	/** 列表与搜索 */
	async getMailList(userId, {
		search, // 搜索条件
		sortType, // 搜索菜单
		sortVal, // 搜索菜单
		orderBy, // 排序
		whereEx, //附加查询条件
		page,
		size,
		isTotal = true,
		oldTotal }) {
		orderBy = orderBy || {
			'MAIL_ORDER': 'asc',
			'MAIL_ADD_TIME': 'desc'
		};
		let fields = 'MAIL_ACCEPT_USER_ID,MAIL_END_TIME,MAIL_STATUS,MAIL_ADD_TIME,MAIL_USER_ID,MAIL_OBJ';

		let where = {};
		where.and = {
			//MAIL_STATUS: 1,
			_pid: this.getProjectId() //复杂的查询在此处标注PID
		};


		if (util.isDefined(search) && search) {
			if (search == '我的发布') {
				where.and.MAIL_USER_ID = userId;
			}
			else if (search == '我的接单') {
				where.and.MAIL_ACCEPT_USER_ID = userId;
			}
			else if (search == '我的收藏') {
				where.and.MAIL_FAV_LIST = userId;
			}

			else {
				where.or = [
					{ 'MAIL_OBJ.title': ['like', search] },
					{ 'MAIL_OBJ.poster': ['like', search] },
					{ 'MAIL_OBJ.tel': ['like', search] },
				];
			}

		} else if (sortType && util.isDefined(sortVal)) {
			// 搜索菜单
			switch (sortType) {
				case 'cateId': {
					where.and.MAIL_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.MAIL_STATUS = Number(sortVal);
					break;
				}
				case 'timeout': { //过期
					where.and.MAIL_STATUS = 0;
					where.and.MAIL_END_TIME = ['<', this._timestamp]
					break;
				}
				case 'wait': { //待接单
					where.and.MAIL_STATUS = 0;
					where.and.MAIL_END_TIME = ['>=', this._timestamp]
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'MAIL_ADD_TIME');
					break;
				}
			}
		}

		return await MailModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);

	}

}

module.exports = MailService;