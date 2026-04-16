const AdminBiz = require('../../../../../../comm/biz/admin_biz.js');
const pageHelper = require('../../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../../helper/cloud_helper.js');

Page({
	data: {
		isLoad: false,
		list: [],
		formShow: false,
		formName: '',
		formAddr: '',
		formOrder: 9999,
	},

	onLoad() {
		if (!AdminBiz.isAdmin(this)) return;
		wx.setNavigationBarTitle({ title: '合作商家' });
		this._load();
	},

	onShow() {
		if (this.data.isLoad) this._load();
	},

	async _load() {
		let res = await cloudHelper.callCloudData('admin/shop_list', { page: 1, size: 200, isTotal: false }, { title: 'bar' });
		if (!res) res = { list: [] };
		this.setData({ list: res.list || [], isLoad: true });
	},

	url(e) {
		pageHelper.url(e, this);
	},

	bindAdd() {
		this.setData({ formShow: true, formName: '', formAddr: '', formOrder: 9999 });
	},

	bindCancelForm() {
		this.setData({ formShow: false });
	},

	async bindSaveAdd() {
		let name = (this.data.formName || '').trim();
		if (!name) {
			pageHelper.showModal('请填写商家名称');
			return;
		}
		try {
			await cloudHelper.callCloudSumbit('admin/shop_insert', {
				name,
				addr: (this.data.formAddr || '').trim(),
				order: Number(this.data.formOrder) || 9999,
			});
			this.setData({ formShow: false });
			pageHelper.showSuccToast('添加成功');
			await this._load();
		} catch (e) {
			console.log(e);
		}
	},

	bindGoGoods(e) {
		let id = pageHelper.dataset(e, 'id');
		wx.navigateTo({ url: '../goods/admin_shop_goods?id=' + id });
	},

	bindDel(e) {
		let id = pageHelper.dataset(e, 'id');
		pageHelper.showConfirm('确认删除该商家及全部商品？', async () => {
			try {
				await cloudHelper.callCloudSumbit('admin/shop_del', { id });
				pageHelper.showSuccToast('已删除');
				await this._load();
			} catch (err) {
				console.log(err);
			}
		});
	},
});
