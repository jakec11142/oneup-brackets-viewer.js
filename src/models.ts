import type { Stage, StageType } from 'brackets-model';

export type ViewerStageType = StageType | 'swiss';

export type ViewerStage = Omit<Stage, 'type'> & {
    type: ViewerStageType;
};
