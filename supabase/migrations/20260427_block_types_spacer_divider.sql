alter table content_blocks drop constraint content_blocks_type_check;

alter table content_blocks add constraint content_blocks_type_check
  check (type = any (array[
    'rich_text',
    'callout',
    'quote',
    'bucket',
    'table',
    'workbook_prompt',
    'structured_prompt',
    'checklist',
    'completion_checklist',
    'fillable_table',
    'file',
    'video',
    'image',
    'spacer',
    'divider'
  ]));
