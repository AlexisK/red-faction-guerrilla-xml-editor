// start
{
    var CONST = {
        tagPrefix : 'tgn__'
    };

    function doLayoutSizing(target) {
        target.classList.add('layout-size');
        return target;
    }

    function createBlock(target) {
        let newBlock = document.createElement('div');
        if ( target ) {
            target.appendChild(newBlock);
        }
        return newBlock;
    }

    function createTextInput(target) {
        let newInput = document.createElement('textarea');
        if ( target ) {
            target.appendChild(newInput);
        }
        return newInput;
    }

    function createInputPair(ref, key, label) {
        let parent    = createBlock();
        let labelNode = createBlock(parent);
        let inputNode = document.createElement('input');
        parent.appendChild(inputNode);
        parent.classList.add('input-pair');

        labelNode.textContent = label || key;
        inputNode.value       = ref[key];

        inputNode.onblur = () => {
            ref[key] = inputNode.value;
            //console.log(ref, key);
            renderResult();
        };

        return parent;
    }

    function readTextFile(file, cb) {
        var rawFile = new XMLHttpRequest();
        rawFile.open("GET", './' + file, false);
        rawFile.onreadystatechange = function () {
            if ( rawFile.readyState === 4 ) {
                if ( rawFile.status === 200 || rawFile.status == 0 ) {
                    var allText = rawFile.responseText;
                    cb(allText);
                }
            }
        };
        rawFile.send(null);
    }

    function readTextFileByRef(ev, cb) {
        var input = ev.target;

        var reader    = new FileReader();
        reader.onload = function () {
            cb(reader.result);
        };
        reader.readAsText(input.files[0]);
    }
}


// init dom
{
    document.body.innerHTML = '';

    var layers = [
        createBlock(document.body),
        createBlock(document.body),
        createBlock(document.body)
    ];

    var fileInput        = document.createElement('input');
    var textInput        = doLayoutSizing(createTextInput(layers[1]));
    var workBlock        = doLayoutSizing(createBlock(layers[2]));
    var textOutput       = createTextInput(layers[0]);
    var globalWorksBlock = doLayoutSizing(createBlock(layers[2]));
    var globalSchema     = null;

    textOutput.classList.add('for-copy');
    globalWorksBlock.classList.add('global-multipliers');

    fileInput.type = "file";
    layers[0].appendChild(fileInput);
    fileInput.onchange = function (ev) {
        readTextFileByRef(ev, text => {
            textInput.value = text;
            processInput();
        });
    };

    textOutput.onclick = () => {
        textOutput.select();

        try {
            document.execCommand('copy');
        } catch (err) {
            console.log('Unable to copy');
        }
    }
}

// processing
var WORKERS    = {
    //weapon : data => representRef('weapon: ' + data.name, data)
};
var globalRefs = [];
var globalNoticedFields = {};


// processing functions
{

    function prefixMerge(list, item) {
        return list.concat([item.split('#')[0]]);
    }

    function generateWorker(type, fieldsAvailable = null, nameKey = 'name') {
        WORKERS[type] = (data, prefix) => {
            //console.log(data);

            if ( !fieldsAvailable ) {
                representRef(type + ': ' + data[nameKey], data, null, null, prefix)
            } else {
                if ( fieldsAvailable.split ) { fieldsAvailable = fieldsAvailable.split(','); }
                representRef(type + ': ' + data[nameKey], data, null, fieldsAvailable, prefix);
            }

        }
    }

    function representRef_iterator(ref, k, data, target, fieldsList, valuesBlock, prefix) {
        if ( typeof(data) === 'object' ) {
            let group = createBlock(valuesBlock);
            representRef(k, data, group, fieldsList, prefixMerge(prefix, k) );
        } else {
            valuesBlock.appendChild(createInputPair(ref, k));
            if ( (parseFloat(ref[k]) == ref[k]) ) {
                globalNoticedFields[prefixMerge(prefix, k).join('.')] = 1.0;
            }
        }
    }

    function representRef(title, ref, target, fieldsList, prefix = []) {
        let parent = createBlock(target || workBlock);

        if ( !target ) {
            let chb      = document.createElement('input');
            chb.type     = 'checkbox';
            chb.onchange = () => {
                if ( chb.checked ) {
                    if ( globalRefs.indexOf(ref) === -1 ) {
                        globalRefs.push(ref);
                    }
                } else {
                    let ind = globalRefs.indexOf(ref);
                    if ( ind >= 0 ) {
                        globalRefs.splice(ind, 1);
                    }
                }
            };
            parent.appendChild(chb);
        }

        let nodeTitle         = createBlock(parent);
        nodeTitle.textContent = title;

        let valuesBlock = createBlock(parent);
        parent.classList.add('representation');
        nodeTitle.classList.add('title');
        valuesBlock.classList.add('values-group');

        if ( !target && fieldsList ) {
            fieldsList.forEach(k => {
                let data = ref[k];

                if ( typeof(data) !== 'undefined' ) {
                    representRef_iterator(ref, k, data, target, fieldsList, valuesBlock, prefix);
                }
            });
        } else {
            for (var k in ref) {
                let data = ref[k];
                representRef_iterator(ref, k, data, target, fieldsList, valuesBlock, prefix);
            }
        }

    }


    function renderPlainTreeSettings_getTargetBlock(el, path) {
        if ( path.length <= 1 ) {
            return el;
        }
        if ( !el[path[0]] ) {
            let parent = createBlock(el);
            let label = createBlock(parent);
            let group = createBlock(parent);

            label.textContent = path[0];
            group.classList.add('values-group');

            el[path[0]] = group;
        }
        return renderPlainTreeSettings_getTargetBlock(el[path[0]], path.slice(1));
    }

    function renderPlainTreeSettings(title, ref, target) {
        let parent = createBlock(target);
        parent.classList.add('representation');

        for ( let k in ref ) {
            let pair = createInputPair(ref, k, k.split('.').slice(-1)[0]);
            renderPlainTreeSettings_getTargetBlock(parent, k.split('.')).appendChild(pair);
        }
    }


    function tagFull(str) { return CONST.tagPrefix + str.toLowerCase(); }

    function tagShort(str) { return str.slice(CONST.tagPrefix.length).toLowerCase(); }

    function breakXMLToDict(target) {
        let result = {};
        if ( target.children.length ) {
            Array.prototype.forEach.call(target.children, (c, i) => {
                if ( result[tagShort(c.tagName)] ) {
                    result[[tagShort(c.tagName), i].join('#')] = breakXMLToDict(c);
                } else {
                    result[tagShort(c.tagName)] = breakXMLToDict(c);
                }
            });
        } else {
            return target.textContent;
        }
        return result;
    }

    function renderXMLNodeFromDict(data, target) {
        target = target || createBlock();
        if ( typeof(data) === 'object' ) {
            for (let k in data) {
                let key     = k.split('#')[0];
                let newNode = document.createElement(CONST.tagPrefix + key);
                target.appendChild(newNode);
                renderXMLNodeFromDict(data[k], newNode);
            }
        } else {
            target.textContent = data;
        }
        return target;
    }

    function iterateSchema(data, prefix = []) {
        if ( typeof(data) === 'object' ) {
            for (var k in data) {
                let key = k.split('#')[0];
                if ( WORKERS[key] && typeof(data[k]) === 'object' ) {
                    WORKERS[key](data[k], prefixMerge(prefix, k));
                } else {
                    iterateSchema(data[k], prefixMerge(prefix, k));
                }
            }
        }
    }

    function renderResult_iterate(ref, key, prefix = []) {
        if( typeof(ref[key]) === 'object' ) {
            let result = {};

            for ( let k in ref[key] ) {
                result[k] = renderResult_iterate(ref[key], k, prefixMerge(prefix, k));
            }

            return result;
        }
        let fullPath = prefix.join('.');
        //console.log(fullPath);
        if ( globalNoticedFields[fullPath] ) {
            return ref[key] * globalNoticedFields[fullPath];
        }
        return ref[key];
    }

    function renderResult() {
        //console.log(globalSchema);
        let result = renderResult_iterate({root:globalSchema}, 'root');

        textOutput.textContent = renderXMLNodeFromDict(result).innerHTML.replace(new RegExp(CONST.tagPrefix + '(\\w)', 'gi'), (match, char) => char.toUpperCase());
    }


    function processInput() {
        let temp       = createBlock();
        temp.innerHTML = textInput.value.replace(/<(\/?)(\w+)( [^>]+)?>/gi, ['<$1', CONST.tagPrefix, '$2$3>'].join(''));
        let schema     = globalSchema = breakXMLToDict(temp);
        //console.log(schema);
        workBlock.textContent = '';
        globalWorksBlock.textContent = '';
        globalRefs = [];
        globalNoticedFields = {};
        iterateSchema(schema);
        renderPlainTreeSettings('Global multipliers', globalNoticedFields, globalWorksBlock);
        //representRef('Global multipliers', globalNoticedFields, globalWorksBlock);
        renderResult();
    }
}


generateWorker('item');
generateWorker('gamestatedata');
generateWorker('weapon', 'ammo_type,magazine_size,max_rounds,damage_scaling_min,damage_scaling_max');
generateWorker('upgrade', 'levels');
generateWorker('explosion', 'ai_sound_radius,radius,crumbleradius,knockdownradius,flinchradius,impulse,human_damage_min,human_damage_max,vehicle_damage_min,vehicle_damage_max,structural_damage');
generateWorker('vehicle', 'default_team,max_hitpoints,mass,collision_damage_scale,terrain_damage_scale,roll_torque_factor,pitch_torque_factor,yaw_torque_factor,engine,transmission,turrets,aerodynamics');
//generateWorker('vehicle');
generateWorker('character', 'max_hit_points,max_speed,inventory,flags');
generateWorker('meleemove');
generateWorker('firing_pattern');
generateWorker('spawn_group_human');


textInput.onblur = processInput;
textInput.value  = '<root><Table><Weapon> <Name>singularity_bomb</Name> <Weapon_class>singularity_bomb</Weapon_class> <Trigger_type>single</Trigger_type> <Ammo_type>thrown</Ammo_type> <Magazine_size>1</Magazine_size> <Max_rounds>2</Max_rounds> <Range_max>35</Range_max> <Range_red>5</Range_red> <Default_refire_delay>2000</Default_refire_delay> <Damage_scaling_max> <Npc_damage>2000</Npc_damage> <Player_damage>2000</Player_damage> <Vehicle_damage>-1</Vehicle_damage> <Player_vehicle_damage>-1</Player_vehicle_damage> </Damage_scaling_max> <Damage_min_dist>10</Damage_min_dist> <_editor> <Category>Entries:MP Overrides</Category> </_editor> <Animation_group>remote charge</Animation_group> <Min_engagement_distance>10</Min_engagement_distance> <Max_engagement_distance>20</Max_engagement_distance> <Inventory_item>singularity_bomb</Inventory_item> <Item_3d>singularity_bomb</Item_3d> <Npc_firing_pattern>Other</Npc_firing_pattern> <Ammo_box_restock>0</Ammo_box_restock> <Num_magazines>2</Num_magazines> <Max_ai_penetrating_distance>40.0</Max_ai_penetrating_distance> <Dummy>False</Dummy> <Reticule_name>ui_hud_reti_singularitybomb</Reticule_name> <Unique_id>105</Unique_id> <Icon_name>ui_hud_weapon_icon_singbomb</Icon_name> <Default_team>EDF</Default_team> <Aim_assist>0.5</Aim_assist> </Weapon> </Table></root>';
processInput();

