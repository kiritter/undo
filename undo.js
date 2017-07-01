/*

	元に戻す！サンプル

*/

//--------------------------------------------------------------------------------
//■ファーストクラスコレクション

var CommandManager = function(view) {
	//操作履歴
	this.cmdStack = [];
	//簡単のため、[ObserverパターンにおけるObserver]を直接１つ保持
	this.view = view;
	//初期表示の通知
	this._notify();
};

//--------------------------------------------------
//Client側の負担を下げるため、do()のみ公開するカタチではなく、Facade的メソッド群を持たせた
CommandManager.prototype.moveUp = function() {
	var id = $('input[name=select]:checked').val();
	var cmd = new MoveCommand(id, MoveCommand.DIRECTION_TYPE.UP);
	this._do(cmd);
};

CommandManager.prototype.moveDown = function() {
	var id = $('input[name=select]:checked').val();
	var cmd = new MoveCommand(id, MoveCommand.DIRECTION_TYPE.DOWN);
	this._do(cmd);
};

CommandManager.prototype.toggleColor = function(id) {
	var cmd = new ToggleColorCommand(id);
	this._do(cmd);
};

CommandManager.prototype.remove = function(id) {
	var cmd = new RemoveCommand(id);
	this._do(cmd);
};

//--------------------------------------------------
CommandManager.prototype._do = function(cmd) {
	//Move処理では、先頭/末尾に達すると、それ以上移動できない
	//そのため、無制限に実行した回数分を履歴に入れるとNG
	//そのため、実際に移動できたときだけ入れるために、戻り値判定している
	var ret = cmd.do();
	if (ret) {
		this.cmdStack.push(cmd);
		this._notify();
	}
};

CommandManager.prototype.undo = function() {
	if (this.cmdStack.length > 0) {
		//popはまさにstackのpop（末尾からひとつ取り出して削除）
		var cmd = this.cmdStack.pop();
		cmd.undo();
		this._notify();
	}
};

CommandManager.prototype.undoAll = function() {
	this.view.startUndoAll();

	var self = this;
	var timer = setInterval(function() {
		self.undo();
		if (self.cmdStack.length <= 0) {
			clearInterval(timer);
			self.view.stopUndoAll();
		}
	}, 200);
};

//Observerへの通知
CommandManager.prototype._notify = function() {
	this.view.update(this.cmdStack);
};


//--------------------------------------------------------------------------------
//■上下の移動コマンド

var MoveCommand = function(id, directionType) {
	this.$targetItem = $('#' + id);
	this.directionType = directionType;
};

MoveCommand.DIRECTION_TYPE = {
	UP: 1
	, DOWN: 2
};

MoveCommand.prototype.do = function() {
	var ret;
	if (this.directionType === MoveCommand.DIRECTION_TYPE.UP) {
		ret = this._moveUp();
	}else{
		ret = this._moveDown();
	}
	return ret;
};

MoveCommand.prototype.undo = function() {
	if (this.directionType === MoveCommand.DIRECTION_TYPE.UP) {
		this._moveDown();
	}else{
		this._moveUp();
	}
};

MoveCommand.prototype._moveUp = function() {
	//自分と同階層にいる直前のdivを探す
	var $prevItem = this.$targetItem.prev('div');
	//存在している場合
	if ($prevItem.length > 0) {
		//自分を、直前divの前に挿入(＝移動)
		this.$targetItem.insertBefore($prevItem);
		return true;
	}else{
		return false;
	}
};

MoveCommand.prototype._moveDown = function() {
	var $nextItem = this.$targetItem.next('div');
	if ($nextItem.length > 0) {
		//自分を、直後divの後に挿入(＝移動)
		this.$targetItem.insertAfter($nextItem);
		return true;
	}else{
		return false;
	}
};

MoveCommand.prototype.getText = function() {
	var name = this.$targetItem.find('label').text();
	var direction;
	if (this.directionType === MoveCommand.DIRECTION_TYPE.UP) {
		direction = '上';
	}else{
		direction = '下';
	}
	var text = '[' + name + ']を' + direction + 'に移動';
	return text;
};


//--------------------------------------------------------------------------------
//■色の切り替えコマンド

var ToggleColorCommand = function(id) {
	this.$targetItem = $('#' + id);

	//このボタン操作時に（本処理の前に）、色を持っているかどうか
	this.hasColor;
	if (this.$targetItem.hasClass(ToggleColorCommand.CONST.CLASS_NAME)) {
		this.hasColor = true;
	}else{
		this.hasColor = false;
	}
};

ToggleColorCommand.CONST = {
	CLASS_NAME: 'color'
};

ToggleColorCommand.prototype.do = function() {
	this.$targetItem.toggleClass(ToggleColorCommand.CONST.CLASS_NAME);
	//固定true
	return true;
};

ToggleColorCommand.prototype.undo = function() {
	this.$targetItem.toggleClass(ToggleColorCommand.CONST.CLASS_NAME);
};

ToggleColorCommand.prototype.getText = function() {
	var name = this.$targetItem.find('label').text();
	var text;
	if (this.hasColor === false) {
		//処理前に色を持っていないということは、色を付ける操作であることを意味している
		text = '[' + name + ']に色を付けました';
	}else{
		text = '[' + name + ']から色を消しました';
	}
	return text;
};


//--------------------------------------------------------------------------------
//■要素の削除コマンド

var RemoveCommand = function(id) {
	this.$targetItem = $('#' + id);

	this.$detachedItem;

	//自分の直前divを、復元時の位置として覚えておく
	this.hasPrevItem;
	this.$prevItem = this.$targetItem.prev('div');
	if (this.$prevItem.length > 0) {
		this.hasPrevItem = true;
	}else{
		this.hasPrevItem = false;
	}
};

RemoveCommand.prototype.do = function() {
	//remove()とdetach()の違い
	//detach()はEventListener等も保持してくれる
	//（今回サンプルではどちらでも動くが、意図はdetach()であるため、detach()を使用する）
	this.$detachedItem = this.$targetItem.detach();
	//固定true
	return true;
};

RemoveCommand.prototype.undo = function() {
	if (this.hasPrevItem === true) {
		//削除時に直前にいたdivの後ろに挿入
		this.$detachedItem.insertAfter(this.$prevItem);
	}else{
		//直前divが存在しないということは、先頭にいたということ
		//そのため、先頭に追加する
		this.$detachedItem.prependTo($('.item-area'));
	}
};

RemoveCommand.prototype.getText = function() {
	var name = this.$targetItem.find('label').text();
	var text = '[' + name + ']を削除しました';
	return text;
};


//--------------------------------------------------------------------------------
//■操作履歴の表示領域を表すView

var CommandHistoryView = function() {
	this.isRunningUndoAll = false;
};

CommandHistoryView.prototype.update = function(cmds) {
	var target = $('#history-view');
	target.empty();

	var len = cmds.length;
	for (var i = 0; i < len; i++) {
		var text = cmds[i].getText();
		var li = $('<li>').text(text);
		target.append(li);
	}

	if (this.isRunningUndoAll === false) {
		if (len > 0) {
			this._enableButton();
		}else{
			this._disableButton();
		}
	}
};

CommandHistoryView.prototype._enableButton = function() {
	$('#btnUndo').prop('disabled', false);
	$('#btnUndoAll').prop('disabled', false);
};

CommandHistoryView.prototype._disableButton = function() {
	$('#btnUndo').prop('disabled', true);
	$('#btnUndoAll').prop('disabled', true);
};

//--------------------------------------------------
CommandHistoryView.prototype.startUndoAll = function() {
	this.isRunningUndoAll = true;
	this._disableButton();
};

CommandHistoryView.prototype.stopUndoAll = function() {
	this.isRunningUndoAll = false;
};

//--------------------------------------------------------------------------------
