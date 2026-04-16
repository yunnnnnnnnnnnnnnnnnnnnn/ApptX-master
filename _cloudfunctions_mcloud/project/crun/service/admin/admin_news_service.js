/**
 * Notes: 资讯后台管理
 * Ver : CCMiniCloud Framework 2.0.1 ALL RIGHTS RESERVED BY cclinux0730 (wechat)
 * Date:  07-11 07:48:00 
 */

const BaseProjectAdminService = require('./base_project_admin_service.js');
const util = require('../../../../framework/utils/util.js');
const dataUtil = require('../../../../framework/utils/data_util.js');
const NewsModel = require('../../model/news_model.js');

class AdminNewsService extends BaseProjectAdminService {

	async getNewsDetail(id) {
		let where = { _id: id };
		let news = await NewsModel.getOne(where, '*');
		if (!news) return null;
		return news;
	}

	async sortNews(id, sort) {
		sort = Number(sort);
		await NewsModel.edit(id, { NEWS_ORDER: sort });
	}

	async delNews(id) {
		await NewsModel.del(id);
	}

	async insertNews({
		title,
		desc,
		cateId,
		cateName,
		order,
		forms
	}) {
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let obj = dataUtil.dbForms2Obj(forms);
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		let data = {
			NEWS_TITLE: title,
			NEWS_DESC: desc || '',
			NEWS_CATE_ID: String(cateId),
			NEWS_CATE_NAME: cateName ? String(cateName) : '',
			NEWS_ORDER: Number(order),
			NEWS_STATUS: 1,
			NEWS_CONTENT: [],
			NEWS_PIC: [],
			NEWS_FORMS: forms,
			NEWS_OBJ: obj,
			NEWS_VOUCH: voucher,
		};

		let id = await NewsModel.insert(data);
		return { id };
	}

	async editNews({
		id,
		title,
		desc,
		cateId,
		cateName,
		order,
		forms
	}) {
		if (!forms || !forms.length) this.AppError('请填写表单内容');

		let obj = dataUtil.dbForms2Obj(forms);
		let voucher = 0;
		if (util.isDefined(obj.price)) {
			let p = Number(obj.price);
			if (!isNaN(p)) voucher = Math.round(p * 100);
		}

		await NewsModel.edit(id, {
			NEWS_TITLE: title,
			NEWS_DESC: desc || '',
			NEWS_CATE_ID: String(cateId),
			NEWS_CATE_NAME: cateName ? String(cateName) : '',
			NEWS_ORDER: Number(order),
			NEWS_FORMS: forms,
			NEWS_OBJ: obj,
			NEWS_VOUCH: voucher,
		});
	}

	async updateNewsForms({
		id,
		hasImageForms
	}) {
		await NewsModel.editForms({ _id: id }, 'NEWS_FORMS', 'NEWS_OBJ', hasImageForms);
	}

	async updateNewsContent({
		id,
		content
	}) {
		if (!content || !Array.isArray(content)) this.AppError('内容格式错误');
		await NewsModel.edit(id, { NEWS_CONTENT: content });
	}

	async updateNewsPic({
		id,
		imgList
	}) {
		if (!imgList || !Array.isArray(imgList)) this.AppError('封面图格式错误');
		await NewsModel.edit(id, { NEWS_PIC: imgList });
		return { urls: imgList };
	}

	async statusNews(id, status) {
		await NewsModel.edit(id, { NEWS_STATUS: Number(status) });
	}

	async getAdminNewsList({
		search,
		sortType,
		sortVal,
		orderBy,
		whereEx,
		page,
		size,
		isTotal = true,
		oldTotal
	}) {

		orderBy = orderBy || {
			'NEWS_ORDER': 'asc',
			'NEWS_ADD_TIME': 'desc'
		};
		let fields = 'NEWS_TITLE,NEWS_DESC,NEWS_CATE_ID,NEWS_CATE_NAME,NEWS_EDIT_TIME,NEWS_ADD_TIME,NEWS_ORDER,NEWS_STATUS,NEWS_CATE2_NAME,NEWS_VOUCH,NEWS_QR,NEWS_OBJ';

		let where = {};
		where.and = {
			_pid: this.getProjectId()
		};

		if (util.isDefined(search) && search) {
			where.or = [
				{ NEWS_TITLE: ['like', search] },
			];

		} else if (sortType && util.isDefined(sortVal)) {
			switch (sortType) {
				case 'cateId': {
					where.and.NEWS_CATE_ID = String(sortVal);
					break;
				}
				case 'status': {
					where.and.NEWS_STATUS = Number(sortVal);
					break;
				}
				case 'top': {
					where.and.NEWS_ORDER = 0;
					break;
				}
				case 'sort': {
					orderBy = this.fmtOrderBySort(sortVal, 'NEWS_ADD_TIME');
					break;
				}

			}
		}

		return await NewsModel.getList(where, fields, orderBy, page, size, isTotal, oldTotal);
	}
}

module.exports = AdminNewsService;
