package org.auscope.portal.server.web.service;

import org.apache.commons.httpclient.HttpClient;
import org.apache.commons.httpclient.HttpMethodBase;
import org.auscope.portal.mineraloccurrence.BoreholeFilter;
import org.auscope.portal.server.domain.filter.FilterBoundingBox;
import org.auscope.portal.server.domain.filter.IFilter;
import org.auscope.portal.server.web.WFSGetFeatureMethodMaker;
import org.jmock.Expectations;
import org.jmock.Mockery;
import org.jmock.lib.legacy.ClassImposteriser;
import org.junit.Assert;
import org.junit.Before;
import org.junit.Test;

public class TestBoreholeService {

    private Mockery context = new Mockery() {{
        setImposteriser(ClassImposteriser.INSTANCE);
    }};

    private BoreholeService service;
    private IFilter mockFilter = context.mock(IFilter.class);
    private BoreholeFilter nvclMockFilter = context.mock(BoreholeFilter.class);
    private HttpServiceCaller mockHttpServiceCaller = context.mock(HttpServiceCaller.class);
    private WFSGetFeatureMethodMaker mockMethodMaker = context.mock(WFSGetFeatureMethodMaker.class);

    @Before
    public void setup() throws Exception {
        service = new BoreholeService();
        service.setHttpServiceCaller(mockHttpServiceCaller);
        service.setWFSGetFeatureMethodMakerPOST(mockMethodMaker);
    }

    @Test
    public void testGetAllBoreholesNoBbox() throws Exception {
        final FilterBoundingBox bbox = new FilterBoundingBox("mySrs", new double[] {0, 1}, new double[] {2,3});
        final String serviceURL = "http://example.com";
        final String filterString = "myFilter";
        final int maxFeatures = 45;
        final String responseString = "xmlString";

        context.checking(new Expectations() {{
            allowing(mockFilter).getFilterStringBoundingBox(bbox);will(returnValue(filterString));

            oneOf(mockMethodMaker).makeMethod(with(any(String.class)), with(any(String.class)), with(any(String.class)), with(any(Integer.class)));
            oneOf(mockHttpServiceCaller).getHttpClient();
            oneOf(mockHttpServiceCaller).getMethodResponseAsString(with(any(HttpMethodBase.class)), with(any(HttpClient.class)));will(returnValue(responseString));
        }});

        HttpMethodBase method = service.getAllBoreholes(serviceURL, "", "", "", 0, bbox);
        String result = mockHttpServiceCaller.getMethodResponseAsString(method, mockHttpServiceCaller.getHttpClient());
        Assert.assertNotNull(result);
        Assert.assertEquals(responseString, result);
    }

    @Test
    public void testGetAllBoreholesBbox() throws Exception {
        final String serviceURL = "http://example.com";
        final String filterString = "";
        final int maxFeatures = 45;
        final String responseString = "xmlString";

        context.checking(new Expectations() {{
            allowing(mockFilter).getFilterStringAllRecords();will(returnValue(filterString));

            oneOf(mockMethodMaker).makeMethod(serviceURL, "gsml:Borehole", filterString, maxFeatures);
            oneOf(mockHttpServiceCaller).getHttpClient();
            oneOf(mockHttpServiceCaller).getMethodResponseAsString(with(any(HttpMethodBase.class)), with(any(HttpClient.class)));will(returnValue(responseString));
        }});

        HttpMethodBase method = service.getAllBoreholes(serviceURL,"", "", "", maxFeatures, null);
        String result = mockHttpServiceCaller.getMethodResponseAsString(method, mockHttpServiceCaller.getHttpClient());
        Assert.assertNotNull(result);
        Assert.assertEquals(responseString, result);
    }


}
