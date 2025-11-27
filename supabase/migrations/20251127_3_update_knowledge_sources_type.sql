-- Migration: Update knowledge_sources type check to include 'markdown'
-- Created: 2025-11-27

alter table knowledge_sources
drop constraint if exists knowledge_sources_type_check;

alter table knowledge_sources
add constraint knowledge_sources_type_check
check (type in ('text', 'pdf', 'url', 'markdown'));
