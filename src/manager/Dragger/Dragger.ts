import {logEnable} from '../../config';
import {MobileTouchEvent, PointerTouchEvent} from '../../interface/DragEvent';
import logger from '../../logger';
import {checkIsMobile, getNextIndexByPercentage, getPrevIndexByPercentage} from '../../utils';
import Configurator from '../Configurator';
import Elementor from '../Elementor';
import ElState from '../Elementor/ElState';
import Eventor from '../Eventor';
import Locator from '../Locator';
import Stater from '../Stater';
import {checkLetItGo, getInRangeIndex} from '../Stater/utils';
import {TEventMap} from './types';
import {calcMoveTranslatePx} from './utils';


/**
 * 拖動控制器
 * 負責處理桌面 pointer 與手機 touch 事件的拖曳邏輯
 * unmount 跟 blur 都需要停止計時器
 */
class Dragger {
    private _configurator: Configurator;
    private _elementor: Elementor;
    private _elState: ElState;
    private _locator: Locator;
    private _stater: Stater;
    private _eventor = new Eventor<TEventMap>();

    /** 一次性消費旗標，拖曳開始時設 true，click capture 消費時設 false */
    private _isDragged = false;

    constructor(manager: {
        configurator: Configurator,
        elementor: Elementor,
        elState: ElState,
        stater: Stater,
    }) {
        this._configurator = manager.configurator;
        this._elementor = manager.elementor;
        this._elState = manager.elState;
        this._stater = manager.stater;
        this._locator = new Locator();
    }


    /**
     * 註冊拖曳開始事件與 capture click 攔截器
     * @param callBack - 拖曳開始時的回呼
     */
    onDragStart = (callBack?: TEventMap['dragStart']) => {
        if(this._elementor.containerEl){
            if(checkIsMobile()){
                this._elementor.containerEl.addEventListener('touchstart', this._onMobileTouchStart, {passive: false});
            }else{
                this._elementor.containerEl.addEventListener('pointerdown', this._onWebMouseStart, {passive: false} as EventListenerOptions);
            }
        }

        if(this._elementor.rootEl){
            this._elementor.rootEl.addEventListener('click', this._onCaptureClick, true);
        }

        this._eventor.on('dragStart', callBack);
    };

    /**
     * 註冊拖曳移動事件
     * @param callBack - 拖曳移動時的回呼
     */
    onDragMove = (callBack?: TEventMap['dragMove']) => {
        this._eventor.on('dragMove', callBack);
    };

    /**
     * 註冊拖曳結束事件
     * @param callBack - 拖曳結束時的回呼
     */
    onDragEnd = (callBack?: TEventMap['dragEnd']) => {
        this._eventor.on('dragEnd', callBack);
    };

    /**
     * 移除拖曳開始事件與 capture click 攔截器
     * @param callBack - 要移除的回呼
     */
    offDragStart = (callBack?: TEventMap['dragStart']) => {
        if(this._elementor.containerEl){
            if(checkIsMobile()) {
                this._elementor.containerEl.removeEventListener('touchstart', this._onMobileTouchStart, {passive: false} as EventListenerOptions);
            }else{
                this._elementor.containerEl.removeEventListener('pointerdown', this._onWebMouseStart, {passive: false} as EventListenerOptions);
            }
        }

        if(this._elementor.rootEl){
            this._elementor.rootEl.removeEventListener('click', this._onCaptureClick, true);
        }

        this._eventor.off('dragStart', callBack);
    };

    /**
     * 移除拖曳移動事件
     * @param callBack - 要移除的回呼
     */
    offDragMove = (callBack?: TEventMap['dragMove']) => {
        this._eventor.off('dragMove', callBack);
    };

    /**
     * 移除拖曳結束事件
     * @param callBack - 要移除的回呼
     */
    offDragEnd = (callBack?: TEventMap['dragEnd']) => {
        this._eventor.off('dragEnd', callBack);
    };


    /**
     * 手機觸控開始
     * @param event - TouchEvent
     */
    private _onMobileTouchStart = (event: TouchEvent): void => {
        if(this._configurator.setting.isDebug && logEnable.dragger.onMobileTouchStart) logger.printInText('[Dragger._onMobileTouchStart]');
        event.stopPropagation();

        this._dragStart();
        this._eventor.emit('dragStart');
        const {containerEl} = this._elementor;
        if (!containerEl) return;

        this._locator.touchStart(new MobileTouchEvent(event), containerEl);

        document.addEventListener('touchmove', this._onMobileTouchMove, {passive: false});
        document.addEventListener('touchend', this._onMobileTouchEnd, {passive: false});
    };


    /**
     * 手機觸控移動
     * @param event - TouchEvent
     */
    private _onMobileTouchMove = (event: TouchEvent): void => {
        event.stopPropagation();

        const touchEvent = new MobileTouchEvent(event);
        if(this._configurator.setting.isDebug && logEnable.dragger.onMobileTouchMove) logger.printInText('[Dragger._onMobileTouchMove]');

        // 判斷是否手勢斜移，如果斜移禁止滑動
        if (this._locator._letItGo === null) {
            this._locator._letItGo = checkLetItGo({
                x: this._locator.startPosition.pageX,
                y: this._locator.startPosition.pageY,
            },{
                x: touchEvent.pageX,
                y: touchEvent.pageY
            });
        }

        if(!this._elementor.containerEl || !this._locator._letItGo) return;

        event.preventDefault(); // 開始滑動禁止捲動BodyScroll

        const movePx = this._locator.touchMove(touchEvent, this._elementor.containerEl);
        this._dragMove(movePx.x);
    };

    /**
     * 手機觸控結束
     * @param event - TouchEvent
     *
     * PS: 不可加 event.preventDefault()，會影響手機 click onClick 事件
     */
    private _onMobileTouchEnd = (event: TouchEvent): void => {
        if(this._configurator.setting.isDebug && logEnable.dragger.onMobileTouchEnd) logger.printInText('[Dragger._onMobileTouchEnd]');
        event.stopPropagation();

        this._locator._letItGo = null;
        const {containerEl} = this._elementor;
        if(containerEl){
            document.removeEventListener('touchmove', this._onMobileTouchMove, false);
            document.removeEventListener('touchend', this._onMobileTouchEnd, false);
        }
        this._dragEnd();
    };


    /**
     * 桌面滑鼠按下
     * @param event - PointerEvent
     */
    private _onWebMouseStart = (event: PointerEvent): void => {
        event.preventDefault();
        if(event.button !== 0) return;

        if(this._configurator.setting.isDebug && logEnable.dragger.onWebMouseStart) logger.printInText('[Dragger._onWebMouseStart]');

        this._dragStart();
        this._eventor.emit('dragStart');

        const {containerEl} = this._elementor;
        if (!containerEl) return;

        this._locator.touchStart(new PointerTouchEvent(event), containerEl);
        const {startPosition} = this._locator;
        const translateX = calcMoveTranslatePx(startPosition.x, event.clientX);
        this._elState
            .transform({translateX});

        document.addEventListener('pointermove', this._onWebMouseMove, false);
        document.addEventListener('pointerup', this._onWebMouseEnd, false);
        document.addEventListener('pointercancel', this._onWebMouseEnd, false);
    };


    /**
     * 桌面滑鼠移動
     * @param event - PointerEvent
     */
    private _onWebMouseMove = (event: PointerEvent):void => {
        event.preventDefault();
        if(this._configurator.setting.isDebug && logEnable.dragger.onWebMouseMove) logger.printInText('[Dragger._onWebMouseMove]');

        if(!this._elementor.containerEl) return;

        this._elementor.containerEl.setPointerCapture(event.pointerId);
        const movePx = this._locator.touchMove(new PointerTouchEvent(event), this._elementor.containerEl);
        this._dragMove(movePx.x);
    };

    /**
     * 桌面滑鼠放開
     * @param event - PointerEvent
     */
    private _onWebMouseEnd = (event: PointerEvent):void => {
        event.preventDefault();

        if(this._configurator.setting.isDebug && logEnable.dragger.onWebMouseEnd) logger.printInText('[Dragger._onWebMouseEnd]');

        document.removeEventListener('pointermove', this._onWebMouseMove, false);
        document.removeEventListener('pointerup', this._onWebMouseEnd, false);
        document.removeEventListener('pointercancel', this._onWebMouseEnd, false);
        this._dragEnd();
    };


    /**
     * Capture 階段攔截 click 事件
     * 當偵測到拖曳時，阻止 click 冒泡到子元素的 onClick
     * 攔截後立即消費旗標，確保下一次 click 正常放行
     * @param event - MouseEvent
     */
    private _onCaptureClick = (event: MouseEvent): void => {
        if(!this._isDragged) return;

        event.stopPropagation();
        event.preventDefault();
        this._isDragged = false;
    };


    private _dragStart() {
        if(this._configurator.setting.isDebug && logEnable.dragger.onDragStart) logger.printInText('[Dragger._dragStart]');
    }

    /**
     * 處理拖曳移動中的位移與效果計算
     * @param moveX - 水平移動距離（px）
     */
    private _dragMove(moveX: number) {
        if(this._configurator.setting.isDebug && logEnable.dragger.onDragMove) logger.printInText('[Dragger._dragMove]');

        const {setting} = this._configurator;

        if (!this._elementor.containerEl ||
            !setting.isEnableMouseMove ||
            !this._elementor.slideItemEls ||
            this._stater.page.total <= 1
        ) return;

        // ⭐ 等同指南的 onDragStarted()：確認拖曳發生，設定一次性消費旗標
        this._isDragged = true;

        const percentage = this._elState.getMovePercentage(moveX); //TODO: 應該移動到 Positioner

        this._eventor.emit('dragMove', percentage);

        this._elState
            .transform({translateX: moveX})
            .moveEffect(percentage);
    }


    /**
     * 拖曳結束，確認停止位置並吸附至目標 Index
     */
    private _dragEnd = (): void => {
        if(this._configurator.setting.isDebug && logEnable.dragger.onDragEnd) logger.printInText('[Dragger._dragEnd]');

        const percentage = this._elState.getMovePercentage(this._locator._endPosition.moveX);
        const startEndMoveX = this._locator._endPosition.pageX - this._locator._startPosition.pageX;

        const movePercentage = this._configurator.setting.movePercentage ?? 0.1;
        if(startEndMoveX > 0){
            const activeIndex = getInRangeIndex(getPrevIndexByPercentage(percentage, movePercentage), this._stater);
            this._eventor.emit('dragEnd', activeIndex);
        }else if(startEndMoveX < 0){
            const activeIndex = getInRangeIndex(getNextIndexByPercentage(percentage, movePercentage), this._stater);
            this._eventor.emit('dragEnd', activeIndex);
        }else{
            this._eventor.emit('dragEnd', this._stater.virtual?.activeIndex);
        }

    };


}


export default Dragger;
