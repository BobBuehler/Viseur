// These are the interfaces for all the states in this game
<%include file="functions.noCreer" />import { IBaseGame, IBaseGameObject, IBasePlayer, IFinishedDelta, IRanDelta } from "@cadre/ts-utils/cadre";
import { GameObjectInstance, GameSpecificDelta } from "src/viseur/game/base-delta";

// This is a file generated by Creer, it may have empty interfaces,
// but we need them, so let's disable that tslint rule
// tslint:disable:no-empty-interface

// -- Game State Interfaces -- \\\
% for game_obj_name in (['Game'] + game_obj_names):
<%

delta_objs = dict(game_objs)
delta_objs['AI'] = ai

def state_obj_type(obj):
    t = shared['vis']['type'](obj['type'], use_game_object_states=False)
    if obj['type']['is_game_object']:
        t = 'GameObjectInstance<I'+t+'State>'
    return t

game_obj = None
if game_obj_name == 'Game':
    game_obj = game
else:
    game_obj = game_objs[game_obj_name]

parent_classes = []
for p in game_obj['parentClasses']:
    parent_classes.append('I' + p + 'State')

if game_obj_name == 'Player':
    parent_classes.append('IBasePlayer')
elif game_obj_name == 'GameObject':
    parent_classes.append('IBaseGameObject')
elif game_obj_name == 'Game':
    parent_classes.append('IBaseGame')

%>
${shared['vis']['block_comment']('', game_obj['description'])}
export interface I${game_obj_name}State extends ${', '.join(parent_classes)} {
% for attr_name in game_obj['attribute_names']:
<%
    attrs = game_obj['attributes'][attr_name]
    #if 'serverPredefined' in attrs and attrs['serverPredefined']:
    #    continue
%>${shared['vis']['block_comment']('    ', attrs['description'])}
    ${attr_name}: ${shared['vis']['type'](attrs['type'])};

% endfor
}
% endfor

// -- Run Deltas -- \\\
<% deltaNames = []%>
% for game_obj_name in game_obj_names + ['AI']:
%   for function_name in sorted(delta_objs[game_obj_name]['functions']):
<%
        is_ai = game_obj_name == 'AI'
        deltaName = game_obj_name + upcase_first(function_name) + ('Finished' if is_ai else 'Ran') + 'Delta'
        deltaNames.append(deltaName)

        function_parms = delta_objs[game_obj_name]['functions'][function_name]
        function_returns = function_parms['returns'] if function_parms['returns'] else {
            'description': 'This run delta does not return a value.',
            'type': {
                'name': 'void',
                'is_game_object': False,
            },
        }

%>${shared['vis']['block_comment'](
    '',
    "The delta about what happened when a '" + game_obj_name + "' ran their '" + function_name + "' function."
)}
export type ${deltaName} = I${'Finished' if is_ai else 'Ran'}Delta & {
    /** Data about why the run/ran occurred. */
    data: {
        /** The player that requested this game logic be ran. */
        player: GameObjectInstance<IPlayerState>;

        /** The data about what was requested be run. */
        ${'order' if is_ai else 'run'}: {
%           if not is_ai:
            /** The reference to the game object requesting a function to be run. */
            caller: GameObjectInstance<I${game_obj_name}State>; // tslint:disable-line:no-banned-terms
%           endif

            /** The name of the function of the caller to run. */
            ${'name' if is_ai else 'functionName'}: "${function_name}";

            /**
             * The arguments to ${game_obj_name}.${function_name},
             * as a ${'positional array of arguments send to the AI' if is_ai else 'map of the argument name to its value'}.
             */
            args: {
%           for i, arg in enumerate(function_parms['arguments']):
${shared['vis']['block_comment']('                ', arg['description'])}
                ${i if is_ai else arg['name']}: ${state_obj_type(arg)};
%           endfor
            };
        };

${shared['vis']['block_comment'](
        '        ',
        function_returns['description']
)}
        returned: ${state_obj_type(function_returns)};
    };
};

%   endfor
% endfor
/** All the possible specific deltas in ${game_name}. */
export type ${game_name}SpecificDelta =
% for i, deltaName in enumerate(deltaNames):
    ${'' if i == 0 else '| '}${deltaName}
% endfor
;

/** The possible delta objects in ${game_name}. */
export type ${game_name}Delta = GameSpecificDelta<${game_name}SpecificDelta>;
