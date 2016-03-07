/*global qs, qsa, $on, $parent, $delegate */

(function (window) {
	'use strict';

	/**
	     * View that abstracts away the browser's DOM completely.
	     * It has two simple entry points:
	     *
	     *   - bind(eventName, handler)
	     *     Takes a todo application event and registers the handler
	     *   - render(command, parameterObject)
	     *     Renders the given command with the options
	     */
	function View(template) {
		this.maps = new app.Maps($('#map')[0]);
		this.$searchbox = $(".searchbox .label");
		this.$compass = $(".compass");
		
		this.template = template;
		var self = this;

/*
		this.template = template;

		this.ENTER_KEY = 13;
		this.ESCAPE_KEY = 27;

		this.$todoList = qs('.todo-list');
		this.$todoItemCounter = qs('.todo-count');
		this.$clearCompleted = qs('.clear-completed');
		this.$main = qs('.main');
		this.$footer = qs('.footer');
		this.$toggleAll = qs('.toggle-all');
		this.$newTodo = qs('.new-todo');
*/

		var opts = {
		  lines: 7 // The number of lines to draw
		, length: 0 // The length of each line
		, width: 5 // The line thickness
		, radius: 7 // The radius of the inner circle
		, scale: 1.25 // Scales overall size of the spinner
		, corners: 1 // Corner roundness (0..1)
		, color: '#2196F3' // #rgb or #rrggbb or array of colors
		, opacity: 0.25 // Opacity of the lines
		, rotate: 0 // The rotation offset
		, direction: 1 // 1: clockwise, -1: counterclockwise
		, speed: 1 // Rounds per second
		, trail: 60 // Afterglow percentage
		, fps: 20 // Frames per second when using setTimeout() as a fallback for CSS
		, zIndex: 2e9 // The z-index (defaults to 2000000000)
		, className: 'spinner' // The CSS class to assign to the spinner
		, top: '50%' // Top position relative to parent
		, left: '50%' // Left position relative to parent
		, shadow: false // Whether to render a shadow
		, hwaccel: false // Whether to use hardware acceleration
		, position: 'absolute' // Element positioning
		}

		this.compassSpinner = new Spinner(opts).spin(this.$compass[0]);
		//spinner.spin();



		$(window).on('resize', function(){
			$(self).trigger('resize');
		});
		
		$(self.maps).on('load', function(){
			$(self).trigger('mapload');
		});

		$(self.maps).on('dragend', function(evt, center){
			$(self).trigger('mapdragend', [center]);
		});

		$(self.maps).on('dragstart', function(){
			$(self).trigger('mapdragstart');
		});
		
		this.$compass.on('click', function() {
			// 파란색인 경우 반응한다.
			if(self.$compass.hasClass('ready')) {
				$('.compass').append(self.compassSpinner.el)
				$('.compass polygon').hide();
		
				$(self).trigger('mapgotocurrent');
			}
		});
	}

/*
			self.view.render('updateAddressLabel', data.address);
			self.view.render('updateTransitList', data.transitList);	
*/
	View.prototype.render = function (viewCmd, parameter) {
		var self = this;
		var viewCommands = {
			setMapCenter: function() {
				var param = parameter;
				var position = param.position;
				var isMylocation = param.isMylocation;

				if(!self.maps) return;
				self.maps.setCenter(position, isMylocation);
				
				// TODO : 콤파스 스피너 멈추기
				$('.compass > .spinner').remove();
				$('.compass polygon').show();
			},
			dimMapCenter: function() {
				self.maps.dimCenter();
			},
			undimMapCenter: function() {
				self.maps.undimCenter();
			},
			pinMapCenter: function() {
				self.maps.pinCenter();
			},
			updateAddressLabel: function() {
				var region = parameter.location.region;
				self.$searchbox.html([region.do, region.si, region.dong, region.ri].join(' '));				
			},
			updateTransitList: function() {
				var transitList = parameter;
				self.refreshTransitList(transitList);
			}
/*
			updateAddressLabel: function () {
				var address = parameter;
				//self.$todoList.innerHTML = self.template.show(parameter);
			},
			updateTransitList: function () {
				var transitList = parameter;
				//self._removeItem(parameter);
			}
*/
		};

		viewCommands[viewCmd]();
	};

	View.prototype._getTransitGroupedArray = function (transitList, isInactive) {
		var transitGroupKeyMap = {};
		var transitGroupKeyArr = [];
		var transitList_ = transitList.filter(function(transit){
			return transit.isInactive === isInactive;
		});
				
		transitList_.forEach(function(transit){
			// 키 만들기 
			var key = ("busID" in transit) ? "busID=" + transit.busID :
				 "stationKey=" + transit.stationInfo.cityName + "_" + transit.stationInfo.lineName ;
			// 키가 맵에 있는지 확인하기 
			if(!transitGroupKeyMap[key]) { // 없으면 
				transitGroupKeyMap[key] = true;
				transitGroupKeyArr.push(key);
			}
		});

		// transitGroupKeyArr : 가까운 순의 유니크한 키 배열이다.
		// transitGroupKeyMap 의 values 를 빈 배열로 초기화 한 후 
		Object.keys(transitGroupKeyMap).forEach(function(key){
			transitGroupKeyMap[key] = [];
		});	
		// 데이터를 담는다
		transitList_.forEach(function(transit){
			// 키 만들기 
			var key = ("busID" in transit) ? "busID=" + transit.busID :
				 "stationKey=" + transit.stationInfo.cityName + "_" + transit.stationInfo.lineName ;
			transitGroupKeyMap[key].push(transit);
		});	
		// transitGroupKeyArr 에 있는 Key 순으로 transitGroupKeyMap 에서 값을 가져와 배열을 만든다.
		return JSON.parse(JSON.stringify(transitGroupKeyArr.map(function(key){
			// direction 당 최초 하나씩만 모아서 사용한다.
			var transitGroup = JSON.parse(JSON.stringify(transitGroupKeyMap[key]));
			
			transitGroup = transitGroup.reduce(function(prv, nxt) {
				var isSamewayExist = prv.some(function(transit){
					return nxt.direction === transit.direction;
				});
				
				return prv.concat(!isSamewayExist ? nxt : []);
			}, []);
			
			return transitGroup;

		})));
	};

	View.prototype.getThemeClasses = function (transit) {
		if(transit.busInfo) {
			var typeName = transit.busInfo.typeName;
			
			switch(typeName) {
				case '간선':
					return 'BG_INDIGO_500';
				case '지선':
					return 'BG_GREEN_700';
				case '일반':
				case '마을':
				case '외곽':
				case '농어촌':
					return 'BG_LIGHT_GREEN_700';
				case '순환':
					return 'BG_YELLOW_600 invert';
				case '공항':
					return 'BG_BLUE_500';
				case '직행':
				case '급행':
				case '광역':
				case '시외':
				case '직행좌석':
				case '간선급행':
					return 'BG_RED_700';
			}
		} else { // 지하철인 경우
			var typeName = transit.stationInfo.cityName +'_' +transit.stationInfo.lineName;
			switch(typeName) {
				case '수도권_4호선':
					return 'BG_LIGHT_BLUE_600';
				case '수도권_1호선':
					return 'BG_INDIGO_700';
				case '수도권_6호선':
					return 'BG_SAND_800';
				case '수도권_공항철도':
					return 'BG_BLUE_200 invert';
					
				case '수도권_2호선':
					return 'BG_GREEN_600';
				case '수도권_9호선':
					return 'BG_SAND_700';
				case '수도권_7호선':
					return 'BG_KHAKI_800';
				case '수도권_3호선':
					return 'BG_ORANGE_800';
				case '수도권_신분당선':
					return 'BG_RED_900';
				case '수도권_경의중앙선':
					return 'BG_TEAL_500';
				case '수도권_5호선':
					return 'BG_DEEP_PURPLE_500';
					
					
				case '수도권_8호선':
					return 'BG_PINK_500';
					
				case '수도권_분당선':
					return 'BG_AMBER_800 invert';
				case '인천_1호선':
					return 'BG_BLUE_100 invert';
					
				case '수도권_에버라인':
					return 'BG_GREEN_300 invert';
			}
		}
		return '';
	}

	View.prototype.updateMapLayout = function () {
		// TODO 첫 카드가 화면 상단 위로 스크롤 되어 지도가 화면에 보이지 않게 되면, 아래 로직이 작동하지 않도록 한다.
		var searchBoxHeight = $('.searchbox')[0].offsetTop + $('.searchbox').height();
		var scrollerTopPadding = $('.transitLayer')[0].offsetTop;
		var scrollPosition = parseInt($('#scroller').css('transform').split(',')[5].replace(')',''));

		var offset = window.innerHeight / 2 + (-1)* ((scrollerTopPadding - scrollerTopPadding + scrollPosition) / 2  + scrollerTopPadding / 2);

		$('#map').css('margin-top', -1 * offset);
		$('.mapOverlay').css('height', scrollerTopPadding - searchBoxHeight + scrollPosition);
		$('.mapOverlay').css('top', searchBoxHeight ); // $('.searchbox').height()/2
		
		$('#scroller').attr('data-position', scrollPosition);

		if(!$('.mapOverlay').hasClass('ready')) {
			$('.mapOverlay').addClass('ready');
		}
		
	};
		
	View.prototype.refreshTransitList = function (transitList) {
		console.log("refreshTransitList with", transitList);
		var self = this;
		var html = "";

		var busTemplet = Handlebars.compile($("#transitItem_template_bus").html());
		var subwayTemplet = Handlebars.compile($("#transitItem_template_subway").html());
/*
		if(this.oScroll) {
			this.oScroll.destroy();
			this.oScroll = null; 
		}
*/		
		$('.transitLayer').html('');
		transitList = JSON.parse(JSON.stringify(transitList));
		
		// 활성화된 아이템을 화면에 뿌리기
		var activeTransitGroupedArray = this._getTransitGroupedArray(transitList, false);

		activeTransitGroupedArray.forEach(function(transitArr){			
			var groupHTML = '<div class="transitItemGroup '+ self.getThemeClasses(transitArr[0])+'">';
			transitArr.forEach(function(transit){
				if("busID" in transit) {
					// 메모를 분리하자
					if(transit.busInfo.busNo.indexOf('(') !== -1) {
						transit.memo = transit.busInfo.busNo.split('(')[1].split(')')[0];
						transit.busInfo.busNo = transit.busInfo.busNo.split('(')[0];
					}
					groupHTML += busTemplet(transit);
				} else {
					var transit_ = JSON.parse(JSON.stringify(transit));
					var stationName = transit_.stationInfo.stationName + '역';
					if(stationName.indexOf('역역') === -1) transit_.stationInfo.stationName = stationName;
										
					var nextStopStationName = transit_.nextStop.stationName + '역';
					if(nextStopStationName.indexOf('역역') === -1) transit_.nextStop.stationName = nextStopStationName;
					
					groupHTML += subwayTemplet(transit_);
				}
			});
			groupHTML += '</div>';
			html += groupHTML;
		});
		
		$('.transitLayer').html(html);

		$('.transitItemGroup').slick({
			dots: true,
			//fade: true,
			arrows: false,
			edgeFriction: 0.33,
			infinite: false,
			touchThreshold: 20,
			speed: 150,
		});
      	
      	// 그룹 별 노선이름 fixed 로 표시되도록 DOM 조작
      	$('.transitItemGroup').each(function(idx, el) {
	      	$( $(el).find('.name')[0].outerHTML ).insertBefore( $(el).find('.slick-list') );
	      	$( '<div class="tool"></div>' ).insertBefore( $(el).find('.slick-list') );
	      	console.log($(el))
      	});

		if($('#scroller').attr('data-position') !== undefined) {
			self.oScroll.refresh();
			self.updateMapLayout();
		} else {
			$('.mapPlaceholder').css("height", $(window).innerHeight());

			this.oScroll = new IScroll('#wrapper', {
				deceleration: 0.0006,
				probeType: 3
			});
		
			var cardInitOffset = $('.transitItemGroup').length > 1 ? 123 : (($('.transitItemGroup').length === 1) ? 101 : 0);
			
			$('.mapPlaceholder').animate({
			    height: $(window).innerHeight() - cardInitOffset
			}, {
				duration: 800,
			    step: function(now, fx){
				    self.updateMapLayout();
					//updateMapOverlayDimenstion(myScroll);
			    },
			    done: function(){
					self.oScroll.refresh();
				    self.updateMapLayout();
				}
			});		
		}

		
		this.oScroll.on('scroll', this.updateMapLayout.bind(this));
		// transitList
		
		setTimeout(this.updateMapLayout, 100);
		
		
		$('.transitItemGroup').on('click tap',function(){
			if(!$(this).hasClass('expanded')){
				$('.transitItemGroup').removeClass('expanded');
			}
			$(this).toggleClass('expanded');
			$(this).on('transitionend webkitTransitionEnd oTransitionEnd', function () {
				self.oScroll.refresh();
				self.updateMapLayout();
			});
		});
		
		//this.updateBackgroundColor();
	};
	
	View.prototype.updateBackgroundColor = function () {
		var color = $('.transitItemGroup').last().css('background-color');
		//// TODO : 아이템 최하단에 별도의 장식용 스타일을 만들어 그곳에 적용한다.
		
		// $('#map').css('background-color', color);
	};

	// Export to window
	window.app = window.app || {};
	window.app.View = View;
}(window));
