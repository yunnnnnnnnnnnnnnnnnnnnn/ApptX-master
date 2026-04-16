/**
 * Notes: 业务基类 
 * Date:  03-15 04:00:00 
 */

const dbUtil = require('../../../framework/database/db_util.js');
const util = require('../../../framework/utils/util.js');
const AdminModel = require('../../../framework/platform/model/admin_model.js');
const NewsModel = require('../model/news_model.js');
const UserModel = require('../model/user_model.js');
const BaseService = require('../../../framework/platform/service/base_service.js');

class BaseProjectService extends BaseService {
	getProjectId() {
		return util.getProjectId();
	}

	/** 仅后台认证的接单员可调用接单接口 */
	async assertCanAcceptOrder(userId) {
		let u = await UserModel.getOne({ USER_MINI_OPENID: userId }, 'USER_WORKER,USER_STATUS');
		if (!u) this.AppError('用户不存在');
		if (u.USER_STATUS !== 1) this.AppError('账号状态异常，无法接单');
		if (u.USER_WORKER !== 1) this.AppError('您不是认证接单员，无法接单');
	}

	async genDetailQr(type, id) {
		const BaseProjectAdminService = require('./admin/base_project_admin_service.js');
		let service = new BaseProjectAdminService();
		return service.genDetailQr(type, id);
	}

	async initSetup() {
		let F = (c) => 'bx_' + c;
		const INSTALL_CL = 'setup_crun';
		const COLLECTIONS = ['setup', 'admin', 'log', 'news', 'mail', 'follow', 'thing', 'food', 'fav', 'user', 'shop', 'shop_good'];
		const CONST_PIC = '/images/cover.gif';

		for (let k = 0; k < COLLECTIONS.length; k++) {
			let name = COLLECTIONS[k];
			if (!await dbUtil.isExistCollection(F(name))) {
				await dbUtil.createCollection(F(name));
			}
		}



		const NEWS_CATE = '1=通知公告';



		if (await dbUtil.isExistCollection(F(INSTALL_CL))) {
			return;
		}

		console.log('### initSetup...');

		if (await dbUtil.isExistCollection(F('admin'))) {
			let adminCnt = await AdminModel.count({});
			if (adminCnt == 0) {
				let data = {};
				data.ADMIN_NAME = 'admin';
				data.ADMIN_PASSWORD = 'e10adc3949ba59abbe56e057f20f883e';
				data.ADMIN_DESC = '超管';
				data.ADMIN_TYPE = 1;
				await AdminModel.insert(data);
			}
		}


		if (await dbUtil.isExistCollection(F('news'))) {
			let newsCnt = await NewsModel.count({});
			if (newsCnt == 0) {
				let newsArr = NEWS_CATE.split(',');
				for (let j in newsArr) {
					let title = newsArr[j].split('=')[1];
					let cateId = newsArr[j].split('=')[0];

					let data = {};
					data.NEWS_TITLE = title + '标题1';
					data.NEWS_DESC = title + '简介1';
					data.NEWS_CATE_ID = cateId;
					data.NEWS_CATE_NAME = title;
					data.NEWS_CONTENT = [{ type: 'text', val: title + '内容1' }];
					data.NEWS_PIC = [CONST_PIC];

					await NewsModel.insert(data);
				}
			}
		}

		if (!await dbUtil.isExistCollection(F(INSTALL_CL))) {
			await dbUtil.createCollection(F(INSTALL_CL));
		}
	}

}

module.exports = BaseProjectService;