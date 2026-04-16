const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const ProjectBiz = require('../../../biz/project_biz.js');

Page({
	data: {
		isLoad: false,
		shopId: '',
		shopName: '',
		shopAddr: '',
		goods: [],
	},

	onLoad(options) {
		ProjectBiz.initPage(this);
		if (!pageHelper.getOptions(this, options)) return;
		this.setData({ shopId: this.data.id });
		wx.setNavigationBarTitle({ title: '选购商品' });
		this._load();
	},

	async _load() {
		let res = await cloudHelper.callCloudData('shop/goods', { shopId: this.data.shopId }, { title: 'bar' });
		if (!res || !res.shop) {
			this.setData({ isLoad: null });
			return;
		}
		let shopName = res.shop.SHOP_NAME || '';
		let shopAddr = res.shop.SHOP_ADDR || '';
		let goods = (res.list || []).map(g => ({
			...g,
			priceYuan: g.GOOD_PRICE != null ? (g.GOOD_PRICE / 100).toFixed(2) : '0.00',
			pickQty: 0,
		}));
		this.setData({ shopName, shopAddr, goods, isLoad: true });
	},

	bindStep(e) {
		let id = pageHelper.dataset(e, 'id');
		let delta = Number(pageHelper.dataset(e, 'delta')) || 0;
		let goods = this.data.goods.map(g => {
			if (g._id !== id) return g;
			let q = (g.pickQty || 0) + delta;
			if (q < 0) q = 0;
			return { ...g, pickQty: q };
		});
		this.setData({ goods });
	},

	bindGoPost() {
		let items = [];
		let sum = 0;
		for (let g of this.data.goods) {
			let q = g.pickQty || 0;
			if (q > 0) {
				let priceYuan = g.GOOD_PRICE / 100;
				items.push({
					goodId: g._id,
					name: g.GOOD_NAME,
					priceYuan,
					qty: q,
					goodPriceFen: g.GOOD_PRICE,
				});
				sum += priceYuan * q;
			}
		}
		if (!items.length) {
			pageHelper.showModal('请先选择商品数量');
			return;
		}
		wx.setStorageSync('FOOD_SHOP_PICK', {
			shopId: this.data.shopId,
			shopName: this.data.shopName,
			shopAddr: this.data.shopAddr,
			items,
			sumYuan: sum,
		});
		wx.navigateTo({ url: '../add/food_add' });
	},
});
