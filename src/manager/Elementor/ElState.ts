
import {IPercentageInfo} from '../../types';
import {objectKeys} from '../../utils';
import Configurator from '../Configurator';
import Eventor from '../Eventor';
import Stater from '../Stater';
import Elementor from './Elementor';
import {TEventMap} from './types';
import {getMoveDistance, getMovePercentage, getStartPosition} from './utils';

class ElState {
    _elementor: Elementor;

    private _configurator: Configurator;
    private _stater: Stater;
    private _isAnimation = false;
    private _eventor = new Eventor<TEventMap>();


    constructor(manager: {
        configurator: Configurator,
        elementor: Elementor,
        stater: Stater,
    }) {
        this._elementor = manager.elementor;
        this._configurator = manager.configurator;
        this._stater = manager.stater;
    }


    get isUseAnimation(){
        return this._elementor.containerEl?.style.transitionDuration !== '0ms';
    }

    get isAnimation(){
        return this._isAnimation;
    }


    onAnimationEnd = (callBack?: TEventMap['animationEnd']) => {
        this._eventor.on('animationEnd', callBack);
    };


    onSlideAnimation = () => {
        this._elementor.containerEl?.addEventListener('transitionstart', this.animationStart, false);
        this._elementor.containerEl?.addEventListener('transitionend', this.animationEnd, false);

    };

    offSlideAnimation = () => {
        this._elementor.containerEl?.removeEventListener('transitionstart', this.animationStart, false);
        this._elementor.containerEl?.removeEventListener('transitionend', this.animationEnd, false);
    };


    /**
     * 取得初始距離
     */
    private _getStartPosition = () => {
        return getStartPosition(this._configurator, this._stater, this._elementor);
    };

    /**
     * Move Percentage
     * @param movePx
     */
    getMovePercentage = (movePx: number) => {
        if(this._elementor.slideItemEls === null || this._elementor.containerEl === null){
            return 0;
        }

        const containerWidth = this._elementor.containerEl.offsetWidth;


        const fixMovePx = movePx * -1; // 改為向右為負, 向左為正
        const lastIndex = this._elementor.slideItemEls.length - 1;


        // 取得每個項目的位置
        const positionList = this._elementor.slideItemEls?.map((row, index) => {
            const fillStartPx = this._configurator.setting.isCenteredSlides ? (containerWidth - row.offsetWidth) / 2: 0;

            const fillOffsetLeft = row.offsetLeft - fillStartPx;
            const offsetRight = (row.offsetLeft + row.offsetWidth);

            return {
                index,
                offsetLeft: row.offsetLeft,
                fillOffsetLeft,
                offsetRight,
                offsetWidth: row.offsetWidth,
                fillStartPx,
            };
        });


        const active = positionList.find((row) => {

            if(row.index === lastIndex && fixMovePx >= row.offsetRight){
                // 超過最後一個 就等於最後一個
                return true;
            }else if(row.index === 0 && fixMovePx <= row.offsetLeft){
                // 小於第一個 就等於第一個
                return true;
            }else if(fixMovePx >= row.offsetLeft && fixMovePx < row.offsetRight){
                return true;
            }

            return false;
        });

        if(active){
            const pro = getMovePercentage(fixMovePx, active.fillOffsetLeft, active.offsetWidth);
            return active.index + pro;
        }
        return 0;
    };



    /**
     * Percentage Move Percentage
     * @param percentage
     */
    getPercentageToMovePx = (percentage: number) => {
        const slideCurrWidth = (this._elementor.slideItemEls && this._elementor.slideItemEls[this._stater.virtual.activeIndex].offsetWidth) ?? 0;
        const startPosition = this._getStartPosition();

        return -(slideCurrWidth * percentage) + startPosition;
    };



    /**
     * Get the target item distance width(px)
     * @param slideIndex
     */
    getMoveDistance = (slideIndex: number): { distance: number, height: number} => {
        if (this._elementor.slideItemEls && this._elementor.slideItemEls[slideIndex]) {
            const slideItemEl = this._elementor.slideItemEls[slideIndex];
            const maxHeight = slideItemEl.offsetHeight || 0;

            return {
                distance: getMoveDistance(slideItemEl.offsetLeft, this._getStartPosition()),
                height: maxHeight,
            };
        }

        return {
            distance: 0,
            height: 0,
        };
    };





    transform(args: {translateX?: number, height?: number}, isUseAnimation = false){
        if(this._elementor.containerEl){
            let isModify = false;
            if(typeof args.translateX !== undefined){
                this._elementor.containerEl.style.transform = `translate(${args.translateX}px, 0px)`;
                isModify = true;
            }

            if(typeof args.height !== undefined) {
                this._elementor.containerEl.style.height = this._configurator.autoHeight.isAutoMaxHeight ? `${args.height}px` : '';
                isModify = true;
            }


            if(isModify){
                this._elementor.containerEl.style.transitionDuration = isUseAnimation
                    ? `${this._configurator.setting.moveTime}ms`
                    : '0ms';
            }

        }

        return this;
    }


    /**
     * 移動效果
     * @param percentage
     * @param isUseAnimation
     */
    moveEffect(percentage: number, isUseAnimation = false){
        const {moveEffect, slidesPerView, isCenteredSlides} = this._configurator.setting;
        if(typeof slidesPerView === 'number' && moveEffect?.moveFn){
            let index = 0;
            if(this._elementor.slideItemEls){
                for(const el of this._elementor.slideItemEls){
                    if(el){
                        // 離場的進度 (因為是 center, 所以需要 除以2)
                        const fadeoutProcess = isCenteredSlides ? Math.floor(slidesPerView / 2) + 1 : slidesPerView;

                        // 目前進度
                        const currActiveIs0Process = percentage - index;

                        // 如果到達1就要下降
                        const calcPercentage = currActiveIs0Process >= 0 ?
                            (fadeoutProcess - currActiveIs0Process) / fadeoutProcess:
                            (fadeoutProcess + currActiveIs0Process) / fadeoutProcess
                        ;

                        // debug
                        // if(index === 0){
                        //     console.log('currActiveIs0Process', currActiveIs0Process, currActiveIs0Process);
                        // }

                        // 離場
                        this._effectFn(el, {
                            calcPercentage,
                            percentage: currActiveIs0Process,
                            index,
                        }, isUseAnimation);
                    }
                    index += 1;
                }
            }

        }
        return this;
    }


    /**
     * 移動效果
     * @param el
     * @param percentageInfo
     * @param isUseAnimation
     */
    private _effectFn = (el: HTMLElement, percentageInfo: IPercentageInfo, isUseAnimation = false) => {
        if(this._configurator.setting.moveEffect?.moveFn){
            const moveStyles = this._configurator.setting.moveEffect.moveFn(percentageInfo);
            if(moveStyles){
                objectKeys(moveStyles).forEach(rowStyleKey => {
                    // @ts-ignore
                    el.style[rowStyleKey] = moveStyles[rowStyleKey];
                });
                if(isUseAnimation){
                    el.style.transition = Object.keys(moveStyles).map(rowStyleKey => {
                        return `${this._configurator.setting.moveEffect?.moveTime ?? '.3s'} ${rowStyleKey}`;
                    }).join(', ');
                }else{
                    el.style.transition = 'none';
                }
            }
        }
    };



    syncActiveState = () => {
        const itemEls = this._elementor.slideItemEls
            ?.filter(row => row);

        // 更改顯示在第幾個 (父元件使用可判定樣式設定)
        const inRangeIndex = this._stater.getInRangeIndex(this._stater.virtual?.activeIndex);
        itemEls
            ?.forEach((row, index) => {
                if(Number(row?.dataset.virtual) === inRangeIndex){
                    row.setAttribute('data-active', '');
                } else if (typeof row?.dataset.active !== 'undefined') {
                    row.removeAttribute('data-active');
                }
            });


        const activePage = this._stater.page.activePage;
        const isFirstPage = (activePage === 1 && this._stater.source.activeInPageIndex === 0);
        const isLastPage = (activePage >= this._stater.page.total && this._stater.source.activeInPageIndex === 0);

        // 更改顯示在第幾頁的樣式 (父元件使用可判定樣式設定)
        if (this._stater.isVisiblePagination && this._stater.page.activePage > 0) {
            this._elementor.pageEls?.forEach((row, index) => {
                if (activePage === index + 1) {
                    row.setAttribute('data-active', '');
                } else if(typeof row?.dataset.active !== 'undefined') {
                    row.removeAttribute('data-active');
                }
            });
        }


        const pageOnlyOne = this._stater.page.total === 1;
        const notPage = typeof this._configurator.setting.slidesPerView === 'number' && this._stater.virtual.total < this._configurator.setting.slidesPerView;

        // 重置先判斷是否存在
        if(typeof this._elementor.rootEl?.dataset.firstPage !== 'undefined'){
            this._elementor.rootEl?.removeAttribute('data-first-page');
        }
        if(typeof this._elementor.rootEl?.dataset.lastPage !== 'undefined'){
            this._elementor.rootEl?.removeAttribute('data-last-page');
        }
        // 提供是否為第一頁/最後一頁的判斷屬性
        if(this._stater.isVisibleNavButton && !this._configurator.setting.isEnableLoop){
            if(isFirstPage || pageOnlyOne || notPage){
                this._elementor.rootEl?.setAttribute('data-first-page', '');
            }
            if(isLastPage || pageOnlyOne || notPage){
                this._elementor.rootEl?.setAttribute('data-last-page',  '');
            }
        }
    };


    animationStart = () => {
        this._isAnimation = true;
        if(this._elementor.containerEl){
            this._elementor.containerEl.dataset.animation = '';
        }
    };

    animationEnd = () => {
        this._isAnimation = false;

        if(this._elementor.containerEl) {
            this._elementor.containerEl.removeAttribute('data-animation');
        }
        this._eventor.emit('animationEnd', this._stater, this._elementor);
    };
}


export default ElState;
