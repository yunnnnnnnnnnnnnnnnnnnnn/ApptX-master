const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		list: [],
	},

	onLoad() {
		ProjectBiz.initPage(this);
		wx.setNavigationBarTitle({ title: '合作商家' });
		this._load();
	},

	async _load() {
		let res = await cloudHelper.callCloudData('shop/list', {}, { title: 'bar' });
		this.setData({ list: (res && res.list) || [], isLoad: true });
	},

	bindGoGoods(e) {
		let id = pageHelper.dataset(e, 'id');
		if (!id) return;
		wx.navigateTo({ url: 'food_shop_goods?id=' + id });
	},
});
