/*
* Licensed to the Apache Software Foundation (ASF) under one
* or more contributor license agreements.  See the NOTICE file
* distributed with this work for additional information
* regarding copyright ownership.  The ASF licenses this file
* to you under the Apache License, Version 2.0 (the
* "License"); you may not use this file except in compliance
* with the License.  You may obtain a copy of the License at
*
*   http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing,
* software distributed under the License is distributed on an
* "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
* KIND, either express or implied.  See the License for the
* specific language governing permissions and limitations
* under the License.
*/

import ComponentModel from '../../model/Component';
import List from '../../data/List';
import * as modelUtil from '../../util/model';
import {
    ComponentOption,
    BoxLayoutOptionMixin,
    LayoutOrient,
    SymbolOptionMixin,
    LineStyleOption,
    ItemStyleOption,
    LabelOption,
    OptionDataValue,
    ZRColor,
    ColorString,
    CommonTooltipOption,
    CallbackDataParams,
    ZREasing
} from '../../util/types';
import Model from '../../model/Model';
import GlobalModel from '../../model/Global';
import { each, isObject, clone, isString } from 'zrender/src/core/util';


export interface TimelineControlStyle extends ItemStyleOption {
    show?: boolean
    showPlayBtn?: boolean
    showPrevBtn?: boolean
    showNextBtn?: boolean
    itemSize?: number
    itemGap?: number
    position?: 'left' | 'right' | 'top' | 'bottom'
    playIcon?: string
    stopIcon?: string
    prevIcon?: string
    nextIcon?: string
}

export interface TimelineCheckpointStyle extends ItemStyleOption,
    SymbolOptionMixin {
    animation?: boolean
    animationDuration?: number
    animationEasing?: ZREasing
}

interface TimelineLineStyleOption extends LineStyleOption {
    show?: boolean
}

interface TimelineLabelOption extends Omit<LabelOption, 'position'> {
    show?: boolean
    // number can be distance to the timeline axis. sign will determine the side.
    position?: 'auto' | 'left' | 'right' | 'top' | 'bottom' | number
    interval?: 'auto' | number
}

export interface TimelineDataItemOption extends SymbolOptionMixin {
    value?: OptionDataValue
    itemStyle?: ItemStyleOption
    label?: TimelineLabelOption
    checkpointStyle?: TimelineCheckpointStyle

    emphasis?: {
        itemStyle?: ItemStyleOption
        label?: TimelineLabelOption
        checkpointStyle?: TimelineCheckpointStyle
    }

    tooltip?: boolean
}

export interface TimelineOption extends ComponentOption, BoxLayoutOptionMixin, SymbolOptionMixin {

    backgroundColor?: ZRColor
    borderColor?: ColorString
    borderWidth?: number

    tooltip?: CommonTooltipOption<CallbackDataParams> & {
        trigger?: 'item'
    }

    show?: boolean

    axisType?: 'category' | 'time' | 'value'

    currentIndex?: number

    autoPlay?: boolean

    rewind?: boolean

    loop?: boolean

    playInterval?: number

    realtime?: boolean

    controlPosition?: 'left' | 'right' | 'top' | 'bottom'

    padding?: number | number[]

    orient?: LayoutOrient

    inverse?: boolean

    lineStyle?: TimelineLineStyleOption
    itemStyle?: ItemStyleOption
    checkpointStyle?: TimelineCheckpointStyle
    controlStyle?: TimelineControlStyle
    label?: TimelineLabelOption

    emphasis?: {
        lineStyle?: TimelineLineStyleOption
        itemStyle?: ItemStyleOption
        checkpointStyle?: TimelineCheckpointStyle
        controlStyle?: TimelineControlStyle
        label?: TimelineLabelOption
    }

    data?: (OptionDataValue | TimelineDataItemOption)[]
}
class TimelineModel extends ComponentModel<TimelineOption> {

    static type = 'timeline'
    type = TimelineModel.type

    layoutMode = 'box'

    private _data: List<TimelineModel>

    private _names: string[]

    /**
     * @override
     */
    init(option: TimelineOption, parentModel: Model, ecModel: GlobalModel) {
        this.mergeDefaultAndTheme(option, ecModel);
        this._initData();
    }

    /**
     * @override
     */
    mergeOption(option: TimelineOption) {
        super.mergeOption.apply(this, arguments as any);
        this._initData();
    }

    setCurrentIndex(currentIndex: number) {
        if (currentIndex == null) {
            currentIndex = this.option.currentIndex;
        }
        var count = this._data.count();

        if (this.option.loop) {
            currentIndex = (currentIndex % count + count) % count;
        }
        else {
            currentIndex >= count && (currentIndex = count - 1);
            currentIndex < 0 && (currentIndex = 0);
        }

        this.option.currentIndex = currentIndex;
    }

    /**
     * @return {number} currentIndex
     */
    getCurrentIndex() {
        return this.option.currentIndex;
    }

    /**
     * @return {boolean}
     */
    isIndexMax() {
        return this.getCurrentIndex() >= this._data.count() - 1;
    }

    /**
     * @param {boolean} state true: play, false: stop
     */
    setPlayState(state: boolean) {
        this.option.autoPlay = !!state;
    }

    /**
     * @return {boolean} true: play, false: stop
     */
    getPlayState() {
        return !!this.option.autoPlay;
    }

    /**
     * @private
     */
    _initData() {
        var thisOption = this.option;
        var dataArr = thisOption.data || [];
        var axisType = thisOption.axisType;
        var names: string[] = this._names = [];

        var processedDataArr: TimelineOption['data'];
        if (axisType === 'category') {
            processedDataArr = [];
            each(dataArr, function (item, index) {
                var value = modelUtil.getDataItemValue(item);
                var newItem;

                if (isObject(item)) {
                    newItem = clone(item);
                    (newItem as TimelineDataItemOption).value = index;
                }
                else {
                    newItem = index;
                }

                processedDataArr.push(newItem);

                if (!isString(value) && (value == null || isNaN(value as number))) {
                    value = '';
                }

                names.push(value + '');
            });
        }
        else {
            processedDataArr = dataArr;
        }

        var dimType = ({
            category: 'ordinal',
            time: 'time',
            value: 'number'
        })[axisType] || 'number';

        var data = this._data = new List([{
            name: 'value', type: dimType
        }], this);

        data.initData(processedDataArr, names);
    }

    getData() {
        return this._data;
    }

    /**
     * @public
     * @return {Array.<string>} categoreis
     */
    getCategories() {
        if (this.get('axisType') === 'category') {
            return this._names.slice();
        }
    }

    /**
     * @protected
     */
    static defaultOption: TimelineOption = {

        zlevel: 0,                  // 一级层叠
        z: 4,                       // 二级层叠
        show: true,

        axisType: 'time',  // 模式是时间类型，支持 value, category

        realtime: true,

        left: '20%',
        top: null,
        right: '20%',
        bottom: 0,
        width: null,
        height: 40,
        padding: 5,

        controlPosition: 'left',           // 'left' 'right' 'top' 'bottom' 'none'
        autoPlay: false,
        rewind: false,                     // 反向播放
        loop: true,
        playInterval: 2000,                // 播放时间间隔，单位ms

        currentIndex: 0,

        itemStyle: {},
        label: {
            color: '#000'
        },

        data: []
    }

}

ComponentModel.registerClass(TimelineModel);

export default TimelineModel;