const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

Page({
	data: {
		isLoad: false,
		shopId: '',
		list: [],
		formShow: false,
		goodName: '',
		goodPrice: '',
		goodOrder: 9999,
	},

	onLoad(options) {
		if (!AdminBiz.isAdmin(this)) return;
		if (!pageHelper.getOptions(this, options)) return;
		this.setData({ shopId: this.data.id });
		wx.setNavigationBarTitle({ title: '商家商品' });
		this._load();
	},

	async _load() {
		let res = await cloudHelper.callCloudData('admin/shop_good_list', { shopId: this.data.shopId }, { title: 'bar' });
		let list = (res && res.list) || [];
		for (let i = 0; i < list.length; i++) {
			let g = list[i];
			g.priceYuan = g.GOOD_PRICE != null ? (g.GOOD_PRICE / 100).toFixed(2) : '';
		}
		this.setData({ list, isLoad: true });
	},

	bindAdd() {
		this.setData({ formShow: true, goodName: '', goodPrice: '', goodOrder: 9999 });
	},

	bindCancelForm() {
		this.setData({ formShow: false });
	},

	async bindSaveGood() {
		let name = (this.data.goodName || '').trim();
		let price = this.data.goodPrice;
		if (!name) {
			pageHelper.showModal('请填写商品名称');
			return;
		}
		if (price === '' || price === undefined || isNaN(Number(price))) {
			pageHelper.showModal('请填写单价（元）');
			return;
		}
		try {
			await cloudHelper.callCloudSumbit('admin/shop_good_insert', {
				shopId: this.data.shopId,
				name,
				price: Number(price),
				order: Number(this.data.goodOrder) || 9999,
			});
			this.setData({ formShow: false });
			pageHelper.showSuccToast('已添加');
			await this._load();
		} catch (e) {
			console.log(e);
		}
	},

	bindDelGood(e) {
		let id = pageHelper.dataset(e, 'id');
		pageHelper.showConfirm('确认删除该商品？', async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/shop_good_del', { id });
				await this._load();
			} catch (err) {
				console.log(err);
			}
		});
	},
});
