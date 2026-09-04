import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Two-Sided Vendor Collaboration — Message & Document Exchange
// Allows vendors and tenants to exchange messages, share documents, and ask/answer
// follow-up questions in real-time within the platform. This is the two-sided
// collaboration engine that powers the vendor collaboration network.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const body = await req.json().catch(() => ({}));
    const action = body.action || 'post_message'; // post_message | upload_document | ask_question | answer_question | create_collaboration | mark_read

    // === CREATE COLLABORATION ===
    if (action === 'create_collaboration') {
      const user = await base44.auth.me().catch(() => null);
      if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
      if (!["admin", "compliance_officer", "risk_manager"].includes(user.role)) {
        return Response.json({ error: "Insufficient permissions" }, { status: 403 });
      }

      const { vendor_id, vendor_name, title, assessment_id, assessment_title, priority } = body;
      if (!vendor_id || !title) return Response.json({ error: "vendor_id and title required" }, { status: 400 });

      const now = new Date().toISOString();
      const collabId = `VC-${Date.now().toString().slice(-6)}`;

      const collab = await sr.entities.VendorCollaboration.create({
        collaboration_id: collabId,
        vendor_id,
        vendor_name: vendor_name || '',
        assessment_id: assessment_id || '',
        assessment_title: assessment_title || '',
        title,
        status: 'open',
        messages: '[]',
        message_count: 0,
        shared_documents: '[]',
        document_count: 0,
        follow_up_questions: '[]',
        open_questions: 0,
        last_activity: now,
        last_message_from: 'none',
        created_at: now,
        tenant_participant_name: user.full_name || user.email,
        priority: priority || 'medium',
        unread_count_tenant: 0,
        unread_count_vendor: 0,
      });

      return Response.json({ status: "created", collaboration_id: collab.id, collaboration: collab });
    }

    // === POST MESSAGE ===
    if (action === 'post_message') {
      const { collaboration_id, text, from_type, from_name, attachment_name, attachment_url } = body;
      if (!collaboration_id || !text) return Response.json({ error: "collaboration_id and text required" }, { status: 400 });

      const collab = await sr.entities.VendorCollaboration.get(collaboration_id);
      let messages = [];
      try { messages = JSON.parse(collab.messages || '[]'); } catch (_) {}

      const now = new Date().toISOString();
      const msgId = `msg-${Date.now()}`;
      messages.push({
        id: msgId,
        from_type: from_type || 'tenant',
        from_name: from_name || 'System',
        text,
        timestamp: now,
        attachment_name: attachment_name || null,
        attachment_url: attachment_url || null,
      });

      const updates = {
        messages: JSON.stringify(messages),
        message_count: messages.length,
        last_activity: now,
        last_message_from: from_type || 'tenant',
      };

      // Increment unread count for the other side
      if (from_type === 'tenant') {
        updates.unread_count_vendor = (collab.unread_count_vendor || 0) + 1;
        updates.status = 'awaiting_vendor';
      } else {
        updates.unread_count_tenant = (collab.unread_count_tenant || 0) + 1;
        updates.status = 'awaiting_tenant';
      }

      await sr.entities.VendorCollaboration.update(collaboration_id, updates);

      return Response.json({ status: "posted", message_id: msgId, message_count: messages.length });
    }

    // === UPLOAD DOCUMENT ===
    if (action === 'upload_document') {
      const { collaboration_id, name, url, uploaded_by, uploaded_by_type, type, size } = body;
      if (!collaboration_id || !name || !url) return Response.json({ error: "collaboration_id, name, and url required" }, { status: 400 });

      const collab = await sr.entities.VendorCollaboration.get(collaboration_id);
      let docs = [];
      try { docs = JSON.parse(collab.shared_documents || '[]'); } catch (_) {}

      const now = new Date().toISOString();
      docs.push({
        name,
        url,
        uploaded_by: uploaded_by || 'Unknown',
        uploaded_by_type: uploaded_by_type || 'tenant',
        uploaded_at: now,
        type: type || 'document',
        size: size || null,
      });

      await sr.entities.VendorCollaboration.update(collaboration_id, {
        shared_documents: JSON.stringify(docs),
        document_count: docs.length,
        last_activity: now,
      });

      return Response.json({ status: "uploaded", document_count: docs.length });
    }

    // === ASK FOLLOW-UP QUESTION ===
    if (action === 'ask_question') {
      const { collaboration_id, question, asked_by, asked_by_type } = body;
      if (!collaboration_id || !question) return Response.json({ error: "collaboration_id and question required" }, { status: 400 });

      const collab = await sr.entities.VendorCollaboration.get(collaboration_id);
      let questions = [];
      try { questions = JSON.parse(collab.follow_up_questions || '[]'); } catch (_) {}

      const now = new Date().toISOString();
      const qId = `q-${Date.now()}`;
      questions.push({
        id: qId,
        question,
        asked_by: asked_by || 'System',
        asked_by_type: asked_by_type || 'tenant',
        asked_at: now,
        answer: null,
        answered_by: null,
        answered_by_type: null,
        answered_at: null,
        status: 'open',
      });

      await sr.entities.VendorCollaboration.update(collaboration_id, {
        follow_up_questions: JSON.stringify(questions),
        open_questions: questions.filter(q => q.status === 'open').length,
        last_activity: now,
      });

      return Response.json({ status: "asked", question_id: qId, open_questions: questions.filter(q => q.status === 'open').length });
    }

    // === ANSWER FOLLOW-UP QUESTION ===
    if (action === 'answer_question') {
      const { collaboration_id, question_id, answer, answered_by, answered_by_type } = body;
      if (!collaboration_id || !question_id || !answer) return Response.json({ error: "collaboration_id, question_id, and answer required" }, { status: 400 });

      const collab = await sr.entities.VendorCollaboration.get(collaboration_id);
      let questions = [];
      try { questions = JSON.parse(collab.follow_up_questions || '[]'); } catch (_) {}

      const now = new Date().toISOString();
      let updated = false;
      for (const q of questions) {
        if (q.id === question_id) {
          q.answer = answer;
          q.answered_by = answered_by || 'System';
          q.answered_by_type = answered_by_type || 'vendor';
          q.answered_at = now;
          q.status = 'answered';
          updated = true;
          break;
        }
      }

      if (!updated) return Response.json({ error: "Question not found" }, { status: 404 });

      await sr.entities.VendorCollaboration.update(collaboration_id, {
        follow_up_questions: JSON.stringify(questions),
        open_questions: questions.filter(q => q.status === 'open').length,
        last_activity: now,
      });

      return Response.json({ status: "answered", question_id, open_questions: questions.filter(q => q.status === 'open').length });
    }

    // === MARK READ ===
    if (action === 'mark_read') {
      const { collaboration_id, side } = body; // side: 'tenant' | 'vendor'
      if (!collaboration_id) return Response.json({ error: "collaboration_id required" }, { status: 400 });

      const updates = side === 'vendor'
        ? { unread_count_vendor: 0 }
        : { unread_count_tenant: 0 };

      await sr.entities.VendorCollaboration.update(collaboration_id, updates);
      return Response.json({ status: "read" });
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("vendorCollaboration error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});