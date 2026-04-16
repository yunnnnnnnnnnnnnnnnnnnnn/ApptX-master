const pageHelper = require('../../../../../helper/page_helper.js');
const cloudHelper = require('../../../../../helper/cloud_helper.js');
const FoodBiz = require('../../../biz/food_biz.js');
const validate = require('../../../../../helper/validate.js');
const PublicBiz = require('../../../../../comm/biz/public_biz.js');
const ProjectBiz = require('../../../biz/project_biz.js');
const PassportBiz = require('../../../../../comm/biz/passport_biz.js');

Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		isLoad: false,
		foodShopMeta: null,
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: async function (options) {
		ProjectBiz.initPage(this);

		if (!await PassportBiz.loginMustBackWin(this)) return;


		this.setData(FoodBiz.initFormData());
		this.setData({
			isLoad: true
		});
	},


	/**
	 * 生命周期函数--监听页面初次渲染完成
	 */
	onReady: function () {
		this._applyFoodShopPick();
	},

	_applyFoodShopPick: function () {
		let pick = wx.getStorageSync('FOOD_SHOP_PICK');
		if (!pick || !pick.shopId) return;
		wx.removeStorageSync('FOOD_SHOP_PICK');
		this.setData({ foodShopMeta: pick });
		let fill = () => {
			let cmpt = this.selectComponent('#cmpt-form');
			if (!cmpt) return;
			let titleParts = (pick.items || []).map(i => i.name + (i.qty > 1 ? '×' + i.qty : ''));
			cmpt.setOneFormVal('title', titleParts.join('、'));
			if (pick.sumYuan != null)
				cmpt.setOneFormVal('price', Number(pick.sumYuan).toFixed(2));
			cmpt.setOneFormVal('address1', pick.shopAddr || '');
		};
		setTimeout(fill, 200);
		setTimeout(fill, 700);
	},

	bindGoShop: function () {
		wx.navigateTo({ url: '../shop/food_shop_index' });
	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () { },

	/**
	 * 生命周期函数--监听页面隐藏
	 */
	onHide: function () { },

	/**
	 * 生命周期函数--监听页面卸载
	 */
	onUnload: function () { },

	onPullDownRefresh: async function () { 
        wx.stopPullDownRefresh();
    },

	url: function (e) {
		pageHelper.url(e, this);
	},


	bindFormSubmit: async function () {
		if (!await PassportBiz.loginMustCancelWin(this)) return;

		let data = this.data;
		data = validate.check(data, FoodBiz.CHECK_FORM, this);
		if (!data) return; 

		let forms = this.selectComponent("#cmpt-form").getForms(true);
		if (!forms) return;
		data.forms = forms; 

		data.cateName = FoodBiz.getCateName(data.cateId);

		if (this.data.foodShopMeta && this.data.foodShopMeta.shopId) {
			data.shopId = this.data.foodShopMeta.shopId;
			data.shopName = this.data.foodShopMeta.shopName || '';
			data.goodsPick = this.data.foodShopMeta.items || [];
		}

		try {

			// 创建
			let result = await cloudHelper.callCloudSumbit('food/insert', data);
			let foodId = result.data.id;

			// 图片
			await cloudHelper.transFormsTempPics(forms, 'food/', foodId, 'food/update_forms');

			let callback = async function () {
				PublicBiz.removeCacheList('admin-food-list');
				PublicBiz.removeCacheList('food-list');
				wx.navigateBack();

			}
			pageHelper.showSuccToast('发布成功', 2000, callback);

		} catch (err) {
			console.log(err);
		}
	},


})