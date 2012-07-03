(function(window){
	return;
	var Element = window.Element || window.HTMLElement,
		Document = window.Document || window.HTMLDocument,
		createElement = document.createElement,
		eventTargets = [
			Element.prototype,
			Document.prototype,
			window.XMLHttpRequest.prototype,
			window
		];

	if(window.addEventListener && window.attachEvent){
		eventTargets.forEach(function(target){
			target.addEventListener = function addEventListener(name, handler, phase){
				var self = this;
				window.attachEvent('on' + name, handler._attachHandler = function(){
					handler.call(self, window.event);
				});
			};
			target.removeEventListener = function removeEventListener(name, handler, phase){
				if(handler._attachHandler){
					window.detachEvent('on' + name, handler._attachHandler);
				}
			}
		});
	}


	if(!window.FormData){
		;(function(){
			var FormData = function FormData(form){
				this.formElement = form || createElement('form');
			};

			FormData.prototype = {
				append: function(name, value){

				}
			}

		}());
	};
	if(!window.XMLHttpRequestUpload && window.XMLHttpRequest){
		;(function(){
			var originalXHR = window.XMLHttpRequest,
				originalSend = originalXHR.prototype.send,
				listenedProperties = [
					'error',
					'progress',
					'load',
					'loadstart',
					'loadend',
					'abort',
					'timeout'
				];
				XMLHttpRequestUpload = function XMLHttpRequestUpload(xhr){
					var upload = createElement('upload'),
						head = document.getElementsByName('head')[0];

					head.insertBefore(upload, head.firstChild);

					upload.addEventListener('propertychange', function(e){
						if(e.propertyName.indexOf('on') === 0){
							var name = e.propertyName.slice(2);

							if(listenedProperties.indexOf(name) !== -1){
								//if()
							}
						}
					}, false);


					return head.removeChild(upload);
				};


			Object.defineProperty(originalXHR.prototype, {
				get: function(){
					if(!this._xhrUpload){
						Object.defineProperty(this, {
							value: XMLHttpRequestUpload(this)
						});
					}
					return this._xhrUpload;
				}
			});

		}());
	}

}(this));